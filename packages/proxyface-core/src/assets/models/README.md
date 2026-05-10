# Embedded ML models


This directory holds the **shipped, browser-bound** model artifacts that
the inference engine loads at runtime. Files here are committed
to the repo so the extension and web app can render the avatar with
zero external network calls.


## How to (re)generate: 
1. Open "datasets" folder
2. Run "proxyface_train.ipynb" in Google Colab the Free-tier T4, uploading "proxyface_emotions.jsonl" (400 sentences per emotion, so 3200 items) to it
3. With the zip downloaded, replace entirely the contents of "emotion" folder
4. Important! keep testing editing the notebook's parameters or its dataset for improved results!


## What should be in "emotion" folder after running step 2's Google Colab notebook:

```
emotion/
  ├─ model_int8.onnx          ~4–5 MB  ← TinyBERT classifier (INT8)
  ├─ tokenizer.json
  ├─ tokenizer_config.json
  ├─ vocab.txt
  ├─ special_tokens_map.json
  ├─ labels.json              ← canonical 8-class label list
  └─ verify_report.json       ← last verification run summary
```

## Do not edit by hand

`labels.json` in particular is the runtime contract between the Python
trainer and the JS inference engine. If you need to change labels, edit
`training/src/proxyface_training/labels.py` and re-run the full
pipeline.
