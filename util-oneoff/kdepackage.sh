set -e
mkdir -p /tmp/kdefiles
cat >/tmp/kdefiles/5.72.0 <<EOF
attica
kapidox
karchive
kcodecs
kconfig
kcoreaddons
kdbusaddons
kdnssd
kguiaddons
ki18n
kidletime
kimageformats
kitemmodels
kitemviews
kplotting
kwidgetsaddons
kwindowsystem
solid
sonnet
threadweaver
kauth
kcompletion
kcrash
kdoctools
kpty
kunitconversion
kconfigwidgets
kservice
kglobalaccel
kpackage
kdesu
kemoticons
kiconthemes
kjobwidgets
knotifications
ktextwidgets
kxmlgui
kbookmarks
kwallet
kdeclarative
kcmutils
kirigami2
knewstuff
frameworkintegration
kinit
knotifyconfig
kparts
kactivities
kded
syntax-highlighting
kpeople
bluez-qt
kfilemetadata
baloo
kactivities-stats
krunner
qqc2-desktop-style
kholidays
purpose
syndication
kcalendarcore
kcontacts
kquickcharts
kio
ktexteditor
plasma-framework
EOF

for version in $(ls /tmp/kdefiles/); do
    for file in $(cat /tmp/kdefiles/${version}); do
        if [ ! -e distfiles/$file-$version.tar.xz ]; then
            cd distfiles
            wget http://download.kde.org/stable/frameworks/5.72/$file-$version.tar.xz
            cd ..
        fi

        if [ ! -e repository/packages/gui/$file.yml ]; then
            cat > repository/packages/gui/$file.yml <<EOF
version: "$version"
bdepend:
  - util/cmake
  - util/extra-cmake-modules
  - gui/qt5-base
rdepend:
  - gui/qt5-base
filename: $file
comp: tar.xz
upstream: http://download.kde.org/stable/frameworks/5.72/
license: LGPL-2.1-or-later
use_build_dir: true
configure: cmake -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF -Wno-dev ../%{unpack_dir}
queue_hooks:
  ldconfig: true
EOF
        fi
    done
done