"""Software-only tests for simulated and optional Raspberry Pi adapters."""
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from arrival import hardware, server
import rfid_identity


TAG = 'KN-RFID-SIM:ADAPTER_TEST_01'


class FakeRFIDReader:
    def __init__(self, value=0xA1B2C3D4, error=None):
        self.value = value
        self.error = error
        self.cleaned = False

    def read_id_no_block(self):
        if self.error:
            raise self.error
        return self.value

    def cleanup(self):
        self.cleaned = True


class FakeTemperatureSensor:
    def __init__(self, value=36.7, error=None):
        self.value = value
        self.error = error

    @property
    def object_temperature(self):
        if self.error:
            raise self.error
        return self.value


class AdapterTests(unittest.TestCase):
    def test_default_is_simulation_and_explicit_switch_uses_injected_real_adapters(self):
        with patch.dict(os.environ, {}, clear=True):
            rfid, temperature = hardware.build_adapters(
                simulated_tags=[TAG], simulated_temperatures=[36.6])
        self.assertIsInstance(rfid, hardware.SimulatedRFIDAdapter)
        self.assertIsInstance(temperature, hardware.SimulatedTemperatureAdapter)
        self.assertEqual((rfid.read_tag(), temperature.read_celsius()), (TAG, 36.6))

        rfid, temperature = hardware.build_adapters(
            'raspberry_pi', rfid_reader=FakeRFIDReader(),
            temperature_sensor=FakeTemperatureSensor())
        self.assertIsInstance(rfid, hardware.MFRC522RFIDAdapter)
        self.assertIsInstance(temperature, hardware.MLX90614TemperatureAdapter)
        self.assertEqual(rfid.read_tag(), 'KN-RFID-HW:MFRC522_A1B2C3D4')
        self.assertEqual(temperature.read_celsius(), 36.7)

    def test_real_mode_fails_safely_when_optional_hardware_stack_is_absent(self):
        with patch.object(hardware.importlib, 'import_module', side_effect=ImportError):
            with self.assertRaises(hardware.HardwareUnavailableError):
                hardware.build_adapters('raspberry_pi')

        class BrokenRFIDModule:
            class SimpleMFRC522:
                def __init__(self):
                    raise ValueError('device not detected')

        with patch.object(hardware.importlib, 'import_module',
                          return_value=BrokenRFIDModule):
            with self.assertRaises(hardware.HardwareUnavailableError):
                hardware.build_adapters('raspberry_pi')

    def test_invalid_sensor_readings_are_rejected_as_transport_errors(self):
        for value in (None, float('nan'), True, '36.7', 19.9, 50.1):
            with self.subTest(value=value):
                adapter = hardware.SimulatedTemperatureAdapter([value])
                with self.assertRaises(hardware.InvalidSensorReadingError):
                    adapter.read_celsius()

    def test_reader_and_sensor_disconnections_are_explicit(self):
        rfid = hardware.MFRC522RFIDAdapter(FakeRFIDReader(error=OSError('offline')))
        with self.assertRaises(hardware.DeviceDisconnectedError):
            rfid.read_tag()
        temperature = hardware.MLX90614TemperatureAdapter(
            FakeTemperatureSensor(error=OSError('offline')))
        with self.assertRaises(hardware.DeviceDisconnectedError):
            temperature.read_celsius()

    def test_duplicate_scan_is_suppressed_before_second_temperature_read(self):
        times = iter((10.0, 11.0))
        capture = hardware.ScreeningCapture(
            hardware.SimulatedRFIDAdapter([TAG, TAG]),
            hardware.SimulatedTemperatureAdapter([36.6]),
            result_policy=lambda _value: 'in_range',
            monotonic=lambda: next(times),
            now=lambda: datetime(2026, 10, 31, tzinfo=timezone.utc),
            event_id_factory=lambda: 'adapter-event-1')
        self.assertEqual(capture.capture()['event_id'], 'adapter-event-1')
        with self.assertRaises(hardware.DuplicateScanError):
            capture.capture()

    def test_failed_temperature_does_not_poison_retry_of_same_tag(self):
        times = iter((10.0, 11.0))
        capture = hardware.ScreeningCapture(
            hardware.SimulatedRFIDAdapter([TAG, TAG]),
            hardware.SimulatedTemperatureAdapter([
                hardware.DeviceDisconnectedError('offline'), 36.7]),
            result_policy=lambda _value: 'in_range',
            monotonic=lambda: next(times),
            now=lambda: datetime(2026, 10, 31, tzinfo=timezone.utc),
            event_id_factory=lambda: 'adapter-recovery-1')
        with self.assertRaises(hardware.DeviceDisconnectedError):
            capture.capture()
        payload = capture.capture()
        self.assertEqual(payload['temperature_c'], 36.7)
        self.assertEqual(payload['event_id'], 'adapter-recovery-1')

    def test_default_policy_is_unclassified_not_a_medical_diagnosis(self):
        capture = hardware.ScreeningCapture(
            hardware.SimulatedRFIDAdapter([TAG]),
            hardware.SimulatedTemperatureAdapter([38.2]),
            monotonic=lambda: 1.0,
            now=lambda: datetime(2026, 10, 31, tzinfo=timezone.utc),
            event_id_factory=lambda: 'adapter-safe-default')
        self.assertEqual(capture.capture()['result'], 'invalid')


class HardwarePayloadWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        folder = Path(self.temp.name)
        self.profile_db = folder / 'profiles.db'
        self.arrival_db = folder / 'arrival.db'
        self.db_patch = patch.object(server, 'DB', str(self.arrival_db))
        self.db_patch.start()
        self.addCleanup(self.db_patch.stop)
        with sqlite3.connect(self.profile_db) as db:
            db.executescript(
                "CREATE TABLE profiles(user INTEGER PRIMARY KEY,name TEXT,age INTEGER);"
                "CREATE TABLE records(id INTEGER PRIMARY KEY,user INTEGER,temperature REAL,"
                "symptoms TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);"
                "INSERT INTO profiles VALUES(900001,'Synthetic Hardware Candidate',72);")
            rfid_identity.init_db(db)
            rfid_identity.assign(db, 900001, 'KN-RFID-HW:MFRC522_A1B2C3D4')
        server.init_db()

    def test_prototype_payload_preserves_database_and_preview_only_workflow(self):
        rfid, temperature = hardware.build_adapters(
            'raspberry_pi', rfid_reader=FakeRFIDReader(),
            temperature_sensor=FakeTemperatureSensor(36.8))
        capture = hardware.ScreeningCapture(
            rfid, temperature,
            now=lambda: datetime.now(timezone.utc),
            monotonic=lambda: 1.0,
            event_id_factory=lambda: 'hardware-prototype-001')
        payload = capture.capture()
        self.assertEqual(payload['result'], 'invalid')
        self.assertTrue(server.enqueue(payload, {}, self.profile_db))

        with sqlite3.connect(self.profile_db) as db:
            record = db.execute(
                'SELECT temperature,source,event_id FROM records').fetchone()
            attendance = db.execute(
                'SELECT method,screening_record_id FROM attendance_events').fetchone()
        self.assertEqual(record, (36.8, 'rfid_hardware_prototype',
                                  'hardware-prototype-001'))
        self.assertEqual(attendance, ('rfid_hardware_prototype', 1))
        with server.connect() as db:
            message, mode, sent = db.execute(
                'SELECT message,delivery_mode,sent FROM outbox').fetchone()
        self.assertIn('TASDIQLANMAGAN', message)
        self.assertEqual((mode, sent), ('preview', 0))
        with patch.object(server, 'send_telegram') as send:
            self.assertFalse(server.deliver_once('not-a-real-token'))
            send.assert_not_called()


if __name__ == '__main__':
    unittest.main()
