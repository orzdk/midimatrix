from mididings import *

config(client_name = 'noclock_mididings')

mypatch = (

		~Filter(SYSRT_CLOCK) >> 
		Print()
)

run(mypatch)