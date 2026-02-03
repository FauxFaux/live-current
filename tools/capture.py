#!/usr/bin/python3

# inspired by https://github.com/Ho-Ro/Hantek6022API/blob/a1903dd9fb00589939557cbab8883b46f84ba0fc/examples/capture_6022.py (gpl v2)

# must be run in a folder with PyHT6022 package: https://github.com/Ho-Ro/Hantek6022API/tree/a1903dd9fb00589939557cbab8883b46f84ba0fc

from PyHT6022.LibUsbScope import Oscilloscope
import time
import sys
from datetime import datetime
from array import array

# Settings
channels = 2
# valid_sample_rates = (20, 32, 50, 64, 100, 128, 200)k
sample_rate = 20 * 1000
sample_time = 1
# valid_gains = (1, 2, 5, 10)
ch1gain = 1
ch2gain = 1

# 20000sps / 50Hz = 400 samples per wave, 4 waves, plus some margin
cap = 400*4 + 5

# Initialize oscilloscope
scope = Oscilloscope()
scope.setup()
if not scope.open_handle():
    print('360 no scope')
    sys.exit(4)

# Upload firmware if needed
if not scope.is_device_firmware_present:
    scope.flash_firmware()

# Set interface (BULK mode)
scope.set_interface(0)
scope.set_num_channels(channels)

# Calculate and set sample rate ID
if sample_rate < 1e6:
    sample_id = int(round(100 + sample_rate / 10e3))  # 20k..500k -> 102..150
else:
    sample_id = int(round(sample_rate / 1e6))  # 1M -> 1

scope.set_sample_rate(sample_id)

# docs say to call this even though *we* don't care?
scope.get_calibration_values()

scope.set_ch1_voltage_range(ch1gain)
scope.set_ch2_voltage_range(ch2gain)

ch1_buf = array('f')
ch2_buf = array('f')


def pcb(ch1_data, ch2_data):
    size = len(ch1_data)
    if size == 0:
        return

    ch1_scaled = scope.scale_read_data( ch1_data, ch1gain, channel=1 )
    ch1_buf.extend(ch1_scaled)

    ch2_scaled = scope.scale_read_data( ch2_data, ch2gain, channel=2 )
    ch2_buf.extend(ch2_scaled)

scope.start_capture()
shutdown_event = scope.read_async(pcb, scope.packetsize, outstanding_transfers=10, raw=True)

def zero_crossing(buf):
    for i in range(3, len(buf) - 3):
        if buf[i-2] <= 0 and buf[i-1] <= 0 and buf[i+1] >= 0 and buf[i+2] >= 0:
            return i
    return None

def handle_bufs():
    global ch1_buf, ch2_buf
    trigger = zero_crossing(ch1_buf)
    if trigger is None:
        print("no trigger")
        return

    sys.stdout.write(f"{datetime.now().isoformat()}\t")

    for v in ch1_buf[trigger:trigger+cap]:
        sys.stdout.write(f"{v:.4f} ")
    sys.stdout.write("\t")
    for v in ch2_buf[trigger:trigger+cap]:
        sys.stdout.write(f"{v:.4f} ")
    sys.stdout.write("\n")
    sys.stdout.flush()


while True:
    try:
        time.sleep(0.001)
        if len(ch1_buf) > 10000:
            handle_bufs()
            ch1_buf.clear()
            ch2_buf.clear()

        scope.poll()
    except Exception as e:
        print(f"error: {e}")
        break

# Stop capture
scope.stop_capture()
shutdown_event.set()

# Fetch remaining packets
time.sleep(0.1)
scope.close_handle()
