# Compatibility shim for the team's trained checkpoint.
# best (1).pt was saved by a YOLOv5 runtime whose pickles reference
# pathlib._local (a Python 3.7-era pathlib backport). Loading it under
# modern Python raises:
#   ModuleNotFoundError: No module named 'pathlib._local'; 'pathlib' is not a package
# and that failure is easy to misread as "the model is incompatible" -- without
# this shim ultralytics instead reports the misleading
#   TypeError: ... appears to be an Ultralytics YOLOv5 model ... NOT forward compatible
# Alias the missing module to the real pathlib and the checkpoint unpickles.
#
# Two conditions are BOTH required to load this checkpoint:
#   1. this shim (for the pickled pathlib._local reference), and
#   2. the repo root on sys.path (PYTHONPATH=/app) so the pickled
#      models.common.* classes resolve against the YOLOv5 source in this repo.
# With only one of the two present it still fails, with a different error each way.

import pathlib
import sys
import types

# Second compatibility fix -- Windows only.
# The checkpoint was trained on Linux (Colab) and pickles a pathlib.PosixPath
# instance holding an absolute Unix path (/content/datasets/My-First-Project-1/
# data.yaml). Unpickling that object on Windows raises:
#   NotImplementedError: cannot instantiate 'PosixPath' on your system
# because pathlib refuses to build a PosixPath when os.name == "nt".
#
# Aliasing the class to WindowsPath lets the pickle reconstruct; the stored path
# is only training metadata and is never opened for inference, so a WindowsPath
# wrapping a Unix-style string is harmless. Guarded by os.name so Linux/Docker
# production behaviour is completely untouched.
#
# Order matters: this must run BEFORE the pathlib._local module below copies
# pathlib's attributes -- that copy freezes its own PosixPath reference at
# copy time, so aliasing pathlib.PosixPath afterwards would leave the frozen
# copy inside pathlib._local pointing at the original, unusable class.
import os

if os.name == "nt":
    pathlib.PosixPath = pathlib.WindowsPath

if "pathlib._local" not in sys.modules:
    _alias = types.ModuleType("pathlib._local")
    for _name in dir(pathlib):
        setattr(_alias, _name, getattr(pathlib, _name))
    sys.modules["pathlib._local"] = _alias

# Keep the pathlib._local module's own PosixPath attribute in sync with
# pathlib's (possibly just-aliased) one -- the pickle's GLOBAL opcode looks
# up sys.modules["pathlib._local"].PosixPath, not pathlib.PosixPath directly,
# so this is what unpickling actually resolves against.
sys.modules["pathlib._local"].PosixPath = pathlib.PosixPath
