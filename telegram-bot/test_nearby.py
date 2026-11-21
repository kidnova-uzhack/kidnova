import unittest
from unittest.mock import patch
import nearby

class NearbyTests(unittest.TestCase):
    def test_results_sorted_and_deduplicated(self):
        data={'elements':[
            {'lat':41.01,'lon':69.0,'tags':{'name':'Far','amenity':'clinic'}},
            {'lat':41.001,'lon':69.0,'tags':{'name':'Near','amenity':'doctors','phone':'123'}},
            {'center':{'lat':41.001,'lon':69.0},'tags':{'name':'Near','amenity':'doctors'}},
            {'lat':45.0,'lon':69.0,'tags':{'name':'Outside','amenity':'clinic'}},
        ]}
        with patch.object(nearby,'load_catalog',return_value=data):
            result=nearby.places(41,69)
        self.assertEqual([x['name'] for x in result],['Near','Far'])
        self.assertEqual(result[0]['phone'],'123')
        self.assertEqual(result[0]['specialty'],'')
    def test_partial_results_raise_error(self):
        with patch.object(nearby,'load_catalog',return_value={'elements':[],'remark':'timed out'}):
            with self.assertRaises(nearby.SearchError):nearby.places(41,69)
    def test_bad_coordinates_make_no_request(self):
        with patch.object(nearby,'load_catalog') as request:
            with self.assertRaises(nearby.SearchError):nearby.places(float('nan'),69)
            request.assert_not_called()
