An operating system.

Building the current container image requires buildah/podman. It's likely to also
require nodejs in the future once I start working on build system engineering stuff
instead of just using the giant terrible shell script.

```
sh fedora_bootstrap.sh
podman run --rm -it --net host --volume /tmp/repo_digi2:/repo digitalis bash
```

Alternatively, you can try the experimental new build tools:

```
cd x10
npm install
node index.js build-image digitalis-stage2
podman run --rm -it --net host digitalis-stage2 bash
```

Your mileage may vary.

Building a QEMU image requires guestfish.

```
sh mkqemuimage.sh
qemu-system-x86_64 -hda digitalis_rootfs.img -m 2G
```

Running that script also creates `digitalis_rootfs.tar`, which can (hopefully) be used for a bare-metal install.

Based on the Linux kernel, openrc, dnf, and GNU.

If you find a bug, you can keep it. For the entomophobes, PRs and issues are welcome.

Nothing here's stable yet.
