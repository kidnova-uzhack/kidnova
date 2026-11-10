import unittest
from unittest.mock import patch
import nearby

class PhoneTests(unittest.TestCase):
    def test_all_contact_fields_are_combined_without_duplicates(self):
        tags={'phone':'+998 (71) 203-30-03;71 200 00 00','contact:phone':'+998712033003','mobile':'+998 90 123 45 67'}
        self.assertEqual(nearby.phone_numbers(tags),['+998712033003','+998712000000','+998901234567'])
    def test_unknown_area_codes_are_not_invented(self):
        tags={'phone':'2431774; +9989137789950'}
        self.assertEqual(nearby.phone_numbers(tags),[])
        self.assertEqual(nearby.local_phone_numbers(tags),['2431774'])
    def test_unicode_dashes(self):
        self.assertEqual(nearby.phone_numbers({'phone':'+998 (71) 200‒12‒33'}),['+998712001233'])
    def test_contact_override_is_bound_to_exact_facility_id(self):
        catalog={'elements':[{'type':'node','id':1,'lat':41,'lon':69,'tags':{'name':'Same brand'}},
                             {'type':'node','id':2,'lat':41.02,'lon':69,'tags':{'name':'Same brand'}}]}
        contacts={'node/1':{'phones':['+998712000000'],'source_url':'https://clinic.example/contacts','label':'Call center'}}
        with patch.object(nearby,'load_catalog',return_value=catalog),patch.object(nearby,'load_contacts',return_value=contacts):
            results=nearby.places(41,69)
        self.assertEqual(results[0]['phone'],'+998712000000')
        self.assertEqual(results[1]['phone'],'')
        self.assertEqual(results[0]['phone_source'],'https://clinic.example/contacts')

if __name__=='__main__':unittest.main()
