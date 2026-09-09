# Catalog quote failure

Use $debug to investigate and fix incorrect quotes. In one long-lived Catalog
instance, a north account quote for two pens correctly costs 8. A south account
quote for three pens immediately afterward costs 12, but its configured price
is 7 per pen, so the customer expects 21. Starting a fresh instance for south
gives 21. Both accounts should be supported by the same instance.

The catalog receives immutable price data; changing prices at runtime is outside
this request. Preserve its public API. Investigate the mechanism, add realistic
regression coverage, and verify the original sequence after the fix.

Run existing tests with `python -m unittest -v`. Work only in this trial
directory. Report the evidence connecting the cause to the symptom and commands
used for validation.
