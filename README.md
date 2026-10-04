# Pygame Arcade

Pygame Arcade is a web-based development environment for making 2D games using the Pygame library for Python, specifically [Pygame Community Edition](https://github.com/pygame-community/pygame-ce), by leveraging the [Pyodide](https://github.com/pyodide/pyodide) WASM-based Python distribution. The environment aims to provide a frictionless experience on par with tools like Scratch and MakeCode for inexperienced programmers to develop games and share them with others using Python, including on restrictive devices like Chromebooks and tablets. The project is currently a work in progress and is continuously evolving.

## License

**License Identifier:** MIT

This software is distributed under the MIT License, which can be found at `LICENSE.txt`. Future versions of the software may be distributed under a different license.

The repository also includes some third-party content distributed under other licenses, specifically:

- `public/assets/wheels/pygame_ce-*.whl`: Pre-built wheels for [Pygame Community Edition (pygame-ce)](https://github.com/pygame-community/pygame-ce) from the Pyodide project, used under pygame-ce's `LGPL-2.1-or-later` license
- `src/aliens-example.zip`: A modified version of pygame-ce's [aliens example](https://github.com/pygame-community/pygame-ce/blob/6f99511016600236ca305c61886daf7b3313fe7c/examples/aliens.py), which is placed in the public domain

## Citation

Pygame Arcade was initially presented as a poster at the United Kingdom and Ireland Computing Education Research conference (UKICER) 2026. You can find the abstract on the [ACM Digital Library](https://dl.acm.org/doi/10.1145/3830800.3830820).

You can cite the poster like so:

```bibtex
@inproceedings{10.1145/3830800.3830820,
  author = {Dunne Fulmer, S{\'e}bastien},
  title = {Pygame Arcade — A browser-based Pygame IDE},
  year = {2026},
  isbn = {9798400725937},
  publisher = {Association for Computing Machinery},
  address = {New York, NY, USA},
  url = {https://doi.org/10.1145/3830800.3830820},
  doi = {10.1145/3830800.3830820},
  booktitle = {Proceedings of the 2026 United Kingdom and Ireland Computing Education Research},
  articleno = {19},
  numpages = {1},
  series = {UKICER 2026}
}
```
