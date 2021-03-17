import { BuildStep, CommandStep, CompositeStep, Spec } from "../Spec";
import * as path from 'path';
import { Environment } from "../Environment";

export default class Bootstrap extends Spec {
    meta = {
        version: "0.1"
    };

    steps = () => ({
        configure: undefined,
        make: undefined,
        install: undefined
    });

    runtime_environment = new Environment([
        { exact: new BootstrapGlibc(), pin: 'hash' },
        { exact: new BootstrapCoreutils(), pin: 'hash' }
    ]);
};

class BootstrapBinaries extends Spec {
    meta = {
        version: "0.1"
    };

    steps = () => ({
        configure: undefined,
        make: undefined,
        install: new CompositeStep([
            new CommandStep("mkdir", ["-pv", path.join(this.tree(), 'bin')], false),
            ...[
                'cat', 'chmod', 'cut', 'cp', 'date', 'echo', 'expr', 'rm', 'mkdir',
                'false', 'true', 'uname', 'mv', 'rmdir', 'head', 'basename', 'sort',
                'tr', 'install', 'ls', 'cmp', 'touch', 'ln', 'tty', 'uniq', 'test',
                'wc', 'sleep', 'gcc', 'make', 'awk', 'gawk', 'grep', 'egrep', 'fgrep',
                'objdump', 'strip', 'as', 'ld', 'sed', 'find', 'xargs', 'sh', 'bash',
                'python3', 'bison', 'ar', 'objcopy', 'gzip', 'install'
            ].map((bin) => new CommandStep("ln", ["-svf", path.join('/usr/bin', bin), path.join(this.tree(), 'bin', bin)], false))
        ])
    });
};


export class BootstrapKernelHeaders extends Spec {
    meta = {
        url: "https://www.kernel.org",
        version: "5.11.2",
        summary: "Development files for the Linux kernel",
        license: "GPLv2 with exceptions"
    };

    options = () => ({
        setup: {
            environment: new Environment([{ exact: new BootstrapBinaries() }])
        },
        fetch: {
            srcs: [{
                url: `https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${this.meta.version}.tar.xz`,
            }]
        },
        workdir: `src/linux-${this.meta.version}`
    });

    install_script = () => `
find usr/include -name '.*' -delete
rm usr/include/Makefile
cp -rv usr/include ${this.tree()}/include
    `;

    steps = () => ({
        "configure": new CommandStep("make", ["mrproper"]),
        "make": new CommandStep("make", ["headers"]),
        "install": new CommandStep("sh", ["-c", this.install_script()])
    });
}

class BootstrapGlibc extends Spec {
    meta = {
        url: "https://www.gnu.org/software/libc/",
        version: "2.33",
        summary: "The GNU C Library",
        license: "LGPLv2+ and LGPLv2+ with exceptions and GPLv2+ and GPLv2+ with exceptions and BSD and Inner-Net and ISC and Public Domain and GFDL"
    };

    private readonly headers = new BootstrapKernelHeaders();

    options = () => ({
        setup: {
            environment: new Environment([
                { exact: new BootstrapBinaries() },
                { exact: this.headers }
            ])
        },
        fetch: {
            srcs: [{
                url: `https://ftp.gnu.org/gnu/glibc/glibc-${this.meta.version}.tar.gz`
            }]
        },
        configure: {
            additional_opts: [
                "--enable-kernel=3.2",
                `--with-headers=${this.headers.tree()}/include`,
                "--disable-werror",
                "--enable-shared",
                "--without-selinux",
                `libc_cv_slibdir=${this.tree()}/lib`
            ]
        },
        workdir: "src/build"
    });

    runtime_environment = new Environment([
        { exact: new BootstrapKernelHeaders(), pin: 'hash' }
    ]);

    post_hooks = (): { [key: string]: BuildStep } => ({
        "unpack": new CommandStep("sed", ["-e", "s/\\& \\~DF_1_NOW/\\& \\~(DF_1_NOW | DF_1_NODEFLIB)/", "-i", `${this.tree()}/src/glibc-${this.meta.version}/elf/get-dynamic-info.h`]),
        "install": new CommandStep("ln", ["-s", `${this.tree()}/lib`, `${this.tree()}/lib64`])
    })
};

class BootstrapCoreutils extends Spec {
    meta = {
        url: "https://www.gnu.org/software/coreutils",
        version: "8.32",
        summary: "Basic file and text utilities",
        license: "GPLv3+"
    };

    options = () => ({
        setup: {
            environment: new Environment([
                { exact: new BootstrapBinaries() },
                { exact: new BootstrapGlibc() }
            ])
        },
        fetch: {
            srcs: [{
                url: `https://ftp.gnu.org/gnu/coreutils/coreutils-${this.meta.version}.tar.gz`
            }]
        }
    });

    runtime_environment = new Environment([
        { exact: new BootstrapGlibc() }
    ]);
};
