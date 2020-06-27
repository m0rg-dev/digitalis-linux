OLDPKG=$1
NEWDIR=$2

mkdir -p packages/$2
OPS=(packages/$OLDPKG*.sh)
NPS=packages/$NEWDIR/$(basename $OPS)
NEWPKG=$NEWDIR/$(basename $OLDPKG)
mv $OPS $NPS

OPN=${OLDPKG%@*}
NPN=${NEWPKG%@*}
OPN=${OPN//\//\\\/}
NPN=${NPN//\//\\\/}

echo "$OLDPKG $NEWDIR $OPS $NPS $OPN $NPN"

sed -i -e "s/$OPN/$NPN/g" bootstrap_2.sh
find packages -type f | xargs sed -i -e "s/$OPN/$NPN/g"