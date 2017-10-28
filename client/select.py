#CONFIGURE HERE
RESIZE_TO = (1920, 1080)
RECT_COLOR = (0, 0, 255) #blue, green, red
RECT_THICKNESS = 1



import sys, cv2

orginal = cv2.imread(sys.argv[1])
small = cv2.resize(orginal, RESIZE_TO)
img = small

isDown = False
changed = False
topLeft = (0, 0)
bottomRight = RESIZE_TO

def onMouse(event, x, y, flags, param):
	global changed, img, isDown, topLeft, bottomRight

	if event == cv2.EVENT_LBUTTONDOWN:
		topLeft = (x, y)
		bottomRight = topLeft
		isDown = True
	elif event == cv2.EVENT_LBUTTONUP:
		bottomRight = (x, y)
		isDown = False
	elif event == cv2.EVENT_MOUSEMOVE and isDown:
		bottomRight = (x, y)
	else:
		return

	img = small.copy()
	cv2.rectangle(img, topLeft, bottomRight, RECT_COLOR, RECT_THICKNESS)
	changed = True

cv2.namedWindow("Selector", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Selector", cv2.WND_PROP_FULLSCREEN, cv2.cv.CV_WINDOW_FULLSCREEN)
cv2.setMouseCallback("Selector", onMouse)

while True:
	cv2.imshow("Selector", img)
	changed = False
	while not changed:
		if cv2.waitKey(20) != -1:
			break
	else:
		continue
	break

orginalHeight, orginalWidth, channel = orginal.shape
resizedWidth, resizedHeight = RESIZE_TO
def transformView(point):
	x, y = point
	x = x * orginalWidth / resizedWidth
	y = y * orginalHeight / resizedHeight
	return (x, y)

x1, y1 = transformView(topLeft)
x2, y2 = transformView(bottomRight)
minX = min(x1, x2)
maxX = max(x1, x2)
minY = min(y1, y2)
maxY = max(y1, y2)

if maxX - minX < 10 and maxY - minY < 10:
	exit(1)

result = orginal[minY : maxY, minX : maxX]
cv2.imwrite(sys.argv[2], result)
