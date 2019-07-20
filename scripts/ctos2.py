from mididings import *

config(client_name = 'ctos2_mididings')

mypatch = (

		Filter(SYSRT_CONTINUE) % Generator(SYSRT_START, EVENT_PORT, EVENT_CHANNEL, 0, 0) >>  		~Filter(SYSCM_SONGPOS) >>  		Print()
)

run(mypatch)