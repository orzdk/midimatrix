

(function() {
    var PyLuma = function (num) {};
        
    PyLuma.pyLuma = (bitMap) => {

    var pyScript = `

import time
import sys
from luma.core.render import canvas
from luma.core import legacy
from luma.core import cmdline, error

def get_device(actual_args=None):

    if actual_args is None:
        actual_args = sys.argv[1:]
        
    parser = cmdline.create_parser(description='luma.examples arguments')
    args = parser.parse_args(actual_args)

    try:
        device = cmdline.create_device(args)
    except error.Error as e:
        parser.error(e)

    return device

def main():
    MY_CUSTOM_BITMAP_FONT = [[${ bitMap }]]

    device = get_device()
    with canvas(device) as draw:
        legacy.text(draw, (0, 0), "\\0", fill="white", font=MY_CUSTOM_BITMAP_FONT)

    time.sleep(100)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    `

    return pyScript;

    }


    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
       module.exports = PyLuma;
    else
        window.PyLuma = PyLuma;

})();


