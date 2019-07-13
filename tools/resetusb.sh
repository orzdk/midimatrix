#!/bin/bash

if (( UID )); then
        exec sudo "$0" "$@"
fi

cd /sys/bus/pci/drivers

function reinit {(
        local d="$1"
        test -e "$d" || return

        rmmod "$d"

        cd "$d"

        for i in $(ls | grep :); do
                echo "$i" > unbind
        done

        sleep 1

        for i in $(ls | grep :); do
                echo "$i" > bind
        done

        modprobe "$d"

)}

for d in ?hci_???; do
        echo " - $d"
        reinit "$d"
done