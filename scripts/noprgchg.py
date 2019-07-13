from mididings import *

config(client_name = 'noprgchg_mididings')

mypatch = (

		~Filter(PROGRAM)
)

run(mypatch)