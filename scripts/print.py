from mididings import *

config(client_name = 'print_mididings')

mypatch = (

		~Filter(SYSRT_SENSING) >> 
		Print()
)

run(mypatch)