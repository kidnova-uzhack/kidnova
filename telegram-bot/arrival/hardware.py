"""Interchangeable device adapters for the KidNova arrival payload.

Simulation is the default. Raspberry Pi adapters import optional hardware
libraries only when explicitly selected and never fall back to fabricated data.
"""
from collections import deque
from datetime import datetime, timezone
import importlib
import math
import os
import time
import uuid

import rfid_identity


class AdapterError(RuntimeError):
    """Base class for safe, expected adapter failures."""


class HardwareUnavailableError(AdapterError):
    """A real adapter cannot start because its dependency/device is absent."""


class DeviceDisconnectedError(AdapterError):
    """A device failed while reading."""


class NoReadingAvailableError(AdapterError):
    """No tag or temperature sample is currently available."""


class InvalidSensorReadingError(AdapterError):
    """A sensor returned a malformed or physically implausible value."""


class DuplicateScanError(AdapterError):
    """The same tag was accepted too recently."""


def validate_temperature(value):
    """Validate transport integrity, not medical normality."""
    if type(value) not in (float, int) or not math.isfinite(value) or not 20 <= value <= 50:
        raise InvalidSensorReadingError('Temperature reading must be a finite number from 20 to 50 °C')
    return float(value)


class SimulatedRFIDAdapter:
    def __init__(self, tags=None):
        self._tags = deque(tags or ())

    def read_tag(self):
        if not self._tags:
            raise NoReadingAvailableError('No simulated RFID scan queued')
        tag = self._tags.popleft()
        try:
            rfid_identity.tag_hash(tag)
        except ValueError as exc:
            raise InvalidSensorReadingError('Simulated RFID tag is invalid') from exc
        return tag

    def close(self):
        pass


class SimulatedTemperatureAdapter:
    def __init__(self, readings=None):
        self._readings = deque(readings or ())

    def read_celsius(self):
        if not self._readings:
            raise NoReadingAvailableError('No simulated temperature queued')
        reading = self._readings.popleft()
        if isinstance(reading, Exception):
            raise reading
        return validate_temperature(reading)

    def close(self):
        pass


class MFRC522RFIDAdapter:
    """Optional Raspberry Pi SPI adapter; no hardware is opened at import time."""

    def __init__(self, reader=None):
        if reader is None:
            try:
                module = importlib.import_module('mfrc522')
                reader = module.SimpleMFRC522()
            except (ImportError, AttributeError, OSError, RuntimeError, ValueError, TypeError) as exc:
                raise HardwareUnavailableError(
                    'MFRC522 adapter unavailable; check optional library, SPI and wiring') from exc
        self.reader = reader

    def read_tag(self):
        try:
            if hasattr(self.reader, 'read_id_no_block'):
                uid = self.reader.read_id_no_block()
            elif hasattr(self.reader, 'read_no_block'):
                result = self.reader.read_no_block()
                uid = result[0] if isinstance(result, tuple) else result
            else:
                raise HardwareUnavailableError(
                    'Installed MFRC522 driver has no supported non-blocking read method')
        except AdapterError:
            raise
        except (OSError, RuntimeError, ValueError, TypeError) as exc:
            raise DeviceDisconnectedError('MFRC522 read failed') from exc
        if uid in (None, 0, ''):
            raise NoReadingAvailableError('No RFID tag present')
        if isinstance(uid, int):
            value = format(uid, 'X')
        elif isinstance(uid, bytes):
            value = uid.hex().upper()
        else:
            value = str(uid).replace('0x', '').replace(':', '').replace(' ', '').upper()
        if not value or any(character not in '0123456789ABCDEF' for character in value):
            raise InvalidSensorReadingError('MFRC522 returned an invalid UID')
        tag = 'KN-RFID-HW:MFRC522_' + value
        rfid_identity.tag_hash(tag)
        return tag

    def close(self):
        cleanup = getattr(self.reader, 'cleanup', None)
        if callable(cleanup):
            cleanup()


class MLX90614TemperatureAdapter:
    """Optional Raspberry Pi I2C adapter for MLX90614 object temperature."""

    def __init__(self, sensor=None, i2c_bus=None):
        self._owned_bus = None
        if sensor is None:
            try:
                board = importlib.import_module('board')
                mlx90614 = importlib.import_module('adafruit_mlx90614')
                bus = i2c_bus or board.I2C()
                if i2c_bus is None:
                    self._owned_bus = bus
                sensor = mlx90614.MLX90614(bus)
            except (ImportError, AttributeError, OSError, RuntimeError, ValueError, TypeError) as exc:
                self.close()
                raise HardwareUnavailableError(
                    'MLX90614 adapter unavailable; check optional library, I2C and wiring') from exc
        self.sensor = sensor

    def read_celsius(self):
        try:
            reading = self.sensor.object_temperature
        except (OSError, RuntimeError, AttributeError, ValueError, TypeError) as exc:
            raise DeviceDisconnectedError('MLX90614 read failed') from exc
        return validate_temperature(reading)

    def close(self):
        if self._owned_bus is not None:
            deinit = getattr(self._owned_bus, 'deinit', None)
            if callable(deinit):
                deinit()
            self._owned_bus = None


def build_adapters(mode=None, simulated_tags=None, simulated_temperatures=None,
                   rfid_reader=None, temperature_sensor=None, i2c_bus=None):
    """Build an explicit pair. Default mode is always software simulation."""
    selected = (mode or os.getenv('KIDNOVA_ADAPTER_MODE', 'simulated')).strip().lower()
    if selected in ('simulated', 'simulation'):
        return (SimulatedRFIDAdapter(simulated_tags),
                SimulatedTemperatureAdapter(simulated_temperatures))
    if selected not in ('raspberry_pi', 'real'):
        raise ValueError('Adapter mode must be simulated or raspberry_pi')
    rfid = MFRC522RFIDAdapter(rfid_reader)
    try:
        temperature = MLX90614TemperatureAdapter(temperature_sensor, i2c_bus)
    except Exception:
        rfid.close()
        raise
    return rfid, temperature


class ScreeningCapture:
    """Combine one tag and one reading into the existing arrival JSON shape."""

    def __init__(self, rfid, temperature, result_policy=None,
                 duplicate_window_seconds=3.0, monotonic=None, now=None,
                 event_id_factory=None):
        self.rfid = rfid
        self.temperature = temperature
        # Without a clinically reviewed policy, never label a reading in-range.
        self.result_policy = result_policy or (lambda _value: 'invalid')
        self.duplicate_window_seconds = duplicate_window_seconds
        self.monotonic = monotonic or time.monotonic
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.event_id_factory = event_id_factory or (lambda: 'rfid-' + str(uuid.uuid4()))
        self._last_tag = None
        self._last_success = None

    def capture(self):
        tag = self.rfid.read_tag()
        try:
            rfid_identity.tag_hash(tag)
        except ValueError as exc:
            raise InvalidSensorReadingError('RFID adapter returned an invalid credential') from exc
        current = self.monotonic()
        if (tag == self._last_tag and self._last_success is not None and
                current - self._last_success < self.duplicate_window_seconds):
            raise DuplicateScanError('Duplicate RFID scan suppressed')
        temperature = self.temperature.read_celsius()
        result = self.result_policy(temperature)
        if result not in ('in_range', 'attention', 'invalid'):
            raise InvalidSensorReadingError('Screening policy returned an invalid result')
        measured = self.now()
        if measured.tzinfo is None:
            raise InvalidSensorReadingError('Capture clock must include a timezone')
        payload = {
            'event_id': self.event_id_factory(),
            'rfid_tag': tag,
            'measured_at': measured.isoformat(),
            'temperature_c': temperature,
            'result': result,
        }
        # Record debounce state only after a complete, valid capture.
        self._last_tag = tag
        self._last_success = current
        return payload

    def close(self):
        self.rfid.close()
        self.temperature.close()
