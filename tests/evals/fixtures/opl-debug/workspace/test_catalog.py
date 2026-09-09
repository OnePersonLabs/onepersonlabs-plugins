import unittest
from catalog import Catalog


class CatalogTests(unittest.TestCase):
    def test_quantity_uses_account_price(self):
        catalog = Catalog({"north": {"pen": 4}})
        self.assertEqual(catalog.quote("north", "pen", 3), 12)

    def test_distinct_items_keep_their_prices(self):
        catalog = Catalog({"north": {"pen": 4, "book": 9}})
        self.assertEqual(catalog.quote("north", "pen", 2), 8)
        self.assertEqual(catalog.quote("north", "book", 2), 18)


if __name__ == "__main__":
    unittest.main()
