An operating system.

Building the current container image requires buildah/podman. It's likely to also
require nodejs in the future once I start working on build system engineering stuff
instead of just using the giant terrible shell script.

```
sh fedora_bootstrap.sh
podman run --rm -it --net host --volume /tmp/repo_digi2:/repo digitalis bash
```

Based on the Linux kernel, openrc, dnf, and GNU.

If you find a bug, you can keep it. For the entomophobes, PRs and issues are welcome.

Nothing here's stable yet.
