"""Small in-memory catalog used by the debugging trial."""

class Catalog:
    def __init__(self, prices):
        self.prices = prices
        self.cache = {}

    def quote(self, account, item, quantity):
        if item not in self.cache:
            self.cache[item] = self.prices[account][item]
        return self.cache[item] * quantity
