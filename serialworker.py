# Serialworker.py code which interfaces with the serial port
# connected to the VEX V5 system
import serial
import time
import multiprocessing
import codecs
import os
import signal
import sys
import threading
import io

from typing import Union

import colorama


## Change this to match your local settings
## IS ignored it is set below
SERIAL_PORT = '/dev/ttyACM1'
SERIAL_BAUDRATE = 115200


class SerialProcess(multiprocessing.Process):
 
    def __init__(self, input_queue, output_queue):
        multiprocessing.Process.__init__(self)
        self.input_queue = input_queue
        self.output_queue = output_queue
        self.sp = serial.Serial()
        self.sp.port = "/dev/ttyACM1"
        #ser.baudrate = 9600
        self.sp.baudrate = 115200
        self.sp.bytesize = serial.EIGHTBITS         #number of bits per bytes
        self.sp.parity = serial.PARITY_NONE         #set parity check: no parity
        self.sp.stopbits = serial.STOPBITS_ONE      #number of stop bits
        #ser.timeout = None                         #block read
        #ser.timeout = 1                            #non-block read
        #ser.timeout = 2                            #timeout block read
        self.sp.xonxoff = False                     #disable software flow control
        self.sp.rtscts = False                      #disable hardware (RTS/CTS) flow control
        self.sp.dsrdtr = False                      #disable hardware (DSR/DTR) flow control
        #ser.writeTimeout = 2                       #timeout for write

        try: 
           self.sp.open()
        except Exception as e:
           print('error open serial port: ' + str(e))
           exit()
 

    def close(self):
        self.sp.close()
 
    def writeSerial(self, data):
        self.sp.write(data)
        # time.sleep(1)
        
    def readSerial(self):
        response = self.sp.readline()
        response = response + b'\r'
        response = response.decode(encoding='UTF-8',errors='strict')
        index=response.find('sout')
        text=''

        for i in range(len(response)):
           if(index == -1):            # if index = -1 sout was not found, don't strip it
              text = text + response[i]
           else:
              if (i > (index+3)):
                text = text + response[i]

        #print(text)            # print cleaned text as it comes from VEX V5 FOR DEBUG
        return(text)

    def run(self):
 
        self.sp.flushInput()
        self.sp.flushOutput()
 
        while True:
            # look for incoming tornado request
            # we are NOT accepting input so it is ignore for now
            if not self.input_queue.empty():
                data = self.input_queue.get()
                # send it to the serial device
                self.writeSerial(data)
                print(data)
 
            # look for incoming serial data
            if (self.sp.inWaiting() > 0):
                data = self.readSerial()
                # send it back to tornado
                self.output_queue.put(data)
                # for debug print also to terminal console
                data = data.rstrip('\n\r')
                print(data)
