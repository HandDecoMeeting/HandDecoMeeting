import cv2
from js import document, setInterval, \
  setTimeout, ImageData, Uint8ClampedArray, \
  CanvasRenderingContext2D as Context2d
from pyodide.ffi import create_proxy, to_js
import asyncio
import gc
import numpy as np

def start(route):
  global cap, frnum, ctx, ShowFrameProxy
  cap = cv2.VideoCapture(route)

  frnum = 0
  canvas = document.getElementById("view")
  ctx = canvas.getContext("2d")
  ShowFrameProxy = create_proxy(ShowFrame)
  setTimeout(ShowFrameProxy, 0)

def draw_image(ctx, x, y, image):
  data = Uint8ClampedArray.new(to_js(image.tobytes()))
  height, width, _ = image.shape
  image_data = ImageData.new(data, width, height)
  ctx.putImageData(image_data, 0, 0, x, y, width, height)

def ShowFrame():
  global cap, frnum, ShowFrameProxy
  cap.set(cv2.CAP_PROP_POS_FRAMES, frnum)
  ret, frame = cap.read() # 두 개의 값을 반환하므로 두 변수 지정
  
  reverse = cv2.cvtColor(frame, cv2.COLOR_BGR2RGBA)
  
  draw_image(ctx, 0, 0, reverse)
  document.getElementById('frameNo').innerHTML=frnum
  frnum=frnum+10
  gc.collect()
  setTimeout(ShowFrameProxy, 0)