"""
fix_dynamic_axes.py
Patches a static-shape ONNX model to accept dynamic sequence lengths.
No retraining. No PyTorch. Just onnx.

Usage:
  pip install onnx
  python fix_dynamic_axes.py

Input:  model_int8_quantized.onnx  (same folder as this script)
Output: model_int8_quantized.onnx  (overwritten in place)
"""
import onnx

INPUT_FILE  = 'model_int8_quantized.onnx'
OUTPUT_FILE = 'model_int8_quantized.onnx'  # overwrite in place

print(f"Loading {INPUT_FILE}...")
model = onnx.load(INPUT_FILE)

patched = 0
for inp in model.graph.input:
    shape = inp.type.tensor_type.shape
    if shape is None:
        continue
    for i, dim in enumerate(shape.dim):
        if dim.HasField('dim_value'):
            if i == 0:  # batch dimension
                dim.ClearField('dim_value')
                dim.dim_param = 'batch'
                patched += 1
            elif i == 1:  # sequence dimension (was fixed at 96)
                print(f"  {inp.name}: dim[1] = {dim.dim_value} → dynamic 'seq'")
                dim.ClearField('dim_value')
                dim.dim_param = 'seq'
                patched += 1

print(f"Patched {patched} dimensions")

onnx.checker.check_model(model)
print("Model validation: ✓")

onnx.save(model, OUTPUT_FILE)
print(f"Saved: {OUTPUT_FILE}")
print("Done — drop this file back into apps/web/public/models/emotion/")
