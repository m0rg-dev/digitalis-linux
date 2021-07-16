[![bootstrap-container](https://github.com/m0rg-dev/digitalis-linux/actions/workflows/bootstrap.yml/badge.svg)](https://github.com/m0rg-dev/digitalis-linux/actions/workflows/bootstrap.yml)

```
make
./bootstrap_1.sh
./bootstrap_2.sh
./bootstrap_3.sh

cid=$(buildah from scratch)
buildah add $cid targetdir /
buildah run $cid /bin/bash
```

Based on the Linux® kernel and GNU userspace tools.

If you find a bug, you can keep it.