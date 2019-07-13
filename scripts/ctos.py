from mididings import *

config(client_name = 'ctos_mididings')

mypatch = (

		Filter(SYSRT_CONTINUE) % Generator(SYSRT_START, EVENT_PORT, EVENT_CHANNEL, 0, 0) >> 
		~Filter(SYSRT_CLOCK,SYSCM_SONGPOS) >> 
		Print()
)

run(mypatch)