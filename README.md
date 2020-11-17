An operating system.

If you have a dnf / yum-based distro available, you should be able to use this
repo to do a installroot install:

```
[digitalis]
name=digitalis
mirrorlist=http://digitalis-repository.s3-website-us-west-1.amazonaws.com/mirrorlist.txt
gpgkey=https://raw.githubusercontent.com/digitalagedragon/digitalis-linux/development/maint-tools/package_key.pem
enabled=1
metadata_expire=1d
gpgcheck=1
```

Something like `dnf install --repo=digitalis --releasever=digi2 --installroot=<root> base-system` (or `bare-metal` if you want it to be bootable).

Note that this currently only uses a S3 bucket as repo storage, and a full install like that is gonna use like 500 MB of bandwidth out of that. Please don't make me get the "hey, you're losing your shirt over here" email alert I set up (if you have or know someone who has mirror space, please let me know).

Building the current container image requires buildah/podman. It's likely to also
require nodejs in the future once I start working on build system engineering stuff
instead of just using the giant terrible shell script.

```
sh fedora_bootstrap.sh
podman run --rm -it --net host --volume /tmp/repo_digi2:/repo digitalis bash
```

Alternatively, you can try the experimental new build tools (requires node, rpm, buildah, and podman).

```
cd x10
npm install
npx tsc
./x10 build-image digitalis-stage1
./x10 build-image digitalis-stage2
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
