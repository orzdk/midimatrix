from mididings import *

config(client_name = 'onlyclock_mididings')

mypatch = (

		Filter(SYSRT_CLOCK)
)

run(mypatch)