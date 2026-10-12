# SignalMaker

A browser-based traffic signal editor with mast arms, span wires, supplementary pole-mounted heads, street-name signs, and regulatory signs.

[Open SignalMaker](https://duskdarf1.github.io/SignalMaker/)

## Run locally

No framework or build step is required. Open `index.html` in a browser, or serve this directory:

```sh
python3 -m http.server 8000
```

Projects are saved locally in your browser. Regulatory Signs supports uploading your own sign images; uploaded artwork is saved with the project and can be reused from the sign picker. Copy and download produce PNG images.

## License and attribution

SignalMaker derives its UI from [SignMaker](https://github.com/JKPotato-Computer/SignMaker), including the [SignMaker v2.2](https://github.com/DuskDarf1/SignMaker), and [SignMaker v2.19 development projects](https://github.com/XtraLqrge/SignMaker). The inherited project history and GNU GPL version 3 license are retained; see [LICENSE](LICENSE).

Credit to XtraLqrge for the search function in the regulatory sign selector, the icon upload feature, the clear all button, the click-to-open menu action, the undo/redo feature, and custom regulatory sign uploads.

Regulatory artwork provenance and extraction metadata are retained in `assets/regulatory-signs/`.
