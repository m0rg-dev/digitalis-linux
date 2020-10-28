This is currently just stream-of-consciousness stuff about toolchain layout and packaging

- Packages other than glibc MUST NOT specify ldconfig in their scripts.
- Packages that install libraries MUST NOT also install programs.
- Packages MUST NOT have build-time dependencies on glibc-devel or libstdc++-devel.
    - Compilers SHOULD have runtime dependencies on glibc-devel and/or libstdc++-devel, as appropriate.
- Libraries SHOULD install pkg-config files.
- Packages that install libraries MUST contain `lib` in their names.
    - Packages that install libraries SHOULD begin with `lib`.
- Packages that do not install libraries SHOULD NOT begin with `lib`.
- Packages SHOULD be buildable for architectures other than that of the build machine with the `%{_host}` RPM variable.
    - Packages MUST NOT build if `%{_host}` is set to anything other than `%{_build}` if they cannot cross-compile.

Cross toolchain layout stuff:

- Programs intended to be run on the %{_host} system SHOULD be installed as `/usr/bin/%{_target}-`.
- Packages SHOULD NOT install programs into `/usr/%{_target}/bin`.
    - If a package does install programs into `/usr/%{_target}/bin`, they MUST be runnable by the %{_host} system.
    - As an exception, packages MAY install programs into `/usr/%{_target}/{,usr/}bin` if no other package would
      depend on them. This is to simplify packages such as `libncurses` / `ncurses`.
- Packages MUST install headers into `/usr/%{_target}/usr/include` (for a cross build).
- Packages MAY install files of any sort into host directories if they include a `%{_target}` component.
    - such as gcc installing into `/usr/lib/gcc/%{_target}/%{version}`

Normal toolchain layout stuff:

- Packages MUST install headers into `/usr/include`.
- Packages SHOULD NOT install static libraries.
- Packages MUST NOT install anything into `/lib64` except where required by LSB.
