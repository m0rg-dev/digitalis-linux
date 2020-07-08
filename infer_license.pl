use strict;

my $file = shift;
my $has_COPYING = `tar xf $file --wildcards '*/COPYING' -O `;
my $has_LICENSE = `tar xf $file --wildcards '*/LICENSE' -O `;

my $given_license = $has_COPYING || $has_LICENSE;
if($given_license) {
    if($given_license =~ /GNU General Public License\s+Version (\d)/smi) {
        my $gpl_version = $1;
        print "I think this is some kind of GPL (version $gpl_version).\n";
        print "Checking for 'or later'...\n";
        my @files = `tar tf $file`;
        foreach my $item (@files) {
            chomp $item;
            if($item =~ /\.c$/) {
                print "$item\n";
                my $text = `tar xf $file $item -O`;
                if($text =~ /the GNU General Public License/smi) {
                    if($text =~ /\(at\s+your\s+option\)\s+any\s+later\s+version/smi) {
                        print "This appears to be GPL-$gpl_version.0-or-later.\n";
                    } else {
                        print "This appears to be GPL-$gpl_version.0-only.\n";
                    }
                    last;
                }
            }
        }
    } else {
        print $given_license;
    }
}