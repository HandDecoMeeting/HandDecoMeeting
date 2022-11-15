import os
import cv2 # pip install opencv-python
import time
import numpy as np # pip install numpy
import mediapipe as mp # pip install mediapipe

from collections import deque
import pyautogui
from datetime import date

# face mesh 설정
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh (
    max_num_faces = 5,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mpDraw = mp.solutions.drawing_utils
drawSpec = mpDraw.DrawingSpec(thickness=1, circle_radius=1)
f = 0

# pen
red = (0, 0, 255)
green = (0, 255, 0)
black = (0, 0, 0)
white = (255, 255, 255)

# 일단 잘보이게 기본 설정을 green
draw_color = green
draw_color_str = "green"

# 강도는 10, 커질수록 두꺼워짐
# 추후에 손가락 연산을 통해 더 두꺼워질 수 있게 설정 가능
thickness = 10
thick = "2"

# color index
black_index = 0
green_index = 0
red_index = 0 

# thick index
thick_index = 0


mpHands = mp.solutions.hands # MediaPipe solution object
hands = mpHands.Hands(max_num_hands = 1) # hand object
mpDraw = mp.solutions.drawing_utils # drawing on hand

# 이전 2번쨰 손가락의 좌표
px = 0
py = 0

# 현재 그리고 있는지
cont = 0
src_cnt = 0
src = 0

# 손가락 1, 2, 3, 4, 5에 해당하는 tip
tipIds = [4, 8, 12, 16, 20]


# !rgb deque
# 여기에 계속 R,G,B 기준으로 그리는걸 데이터로 쌓는다
# 어차피 (px, py) -> (index_lm_x, index_lm_y) 로 갈 때만 그리므로
# 모든 (px, py) 의 데이터들만 기억해 두었다가
# 추후에 화면에 뿌리기 전에 연결만 해주면 된다
# 색에 따라 R,G,B 로 나누어서 저장
bpoints = [deque(maxlen=1024)]
gpoints = [deque(maxlen=1024)]
rpoints = [deque(maxlen=1024)]
thickpoints = [deque(maxlen=1024)]

num_icons = []
button_icons = []
effect_icons = {}
icon_root = "../icons"
button_icon_root = "../icons/ui/buttons"
button_icon_path = os.path.join(icon_root, "ui/buttons")

num_icon_root = "../icons/ui/nums"
num_icon_path = os.path.join(icon_root, "ui/nums")
default_icon_path = os.path.join(icon_root, "ui/na.png")
files = os.listdir(num_icon_root)
button_files = os.listdir(button_icon_root)
effects = ["eye", "shade", "nose", "mustache", "mask"]
current_effect = None
effect_icon_counter = {
    "eye": 0,
    "shade": 0,
    "nose": 0,
    "mustache": 0,
    "mask": 0
}
current_effect_icons = {
    "eye": None,
    "shade": None,
    "nose": None,
    "mustache": None,
    "mask": None
}
effect_commands = { # 스티커 종류 선택 번호
    ord('1'): "eye",
    ord('2'): "shade",
    ord('3'): "nose",
    ord('4'): "mustache",
    ord('5'): "mask",
}
status_panel_effect_icon_cordinates = { # 좌측 메뉴에 스티커 배치 위치
    "eye": {'y': 370, "y+h": 400, 'x': 250, "x+w": 310},
    "shade": {'y': 420, "y+h": 450, 'x': 250, "x+w": 310},
    "nose": {'y': 470, "y+h": 500, 'x': 250, "x+w": 310},
    "mustache": {'y': 520, "y+h": 550, 'x': 250, "x+w": 310},
    "mask": {'y': 570, "y+h": 600, 'x': 250, "x+w": 310},
}
inc_dec_commands = [0x270000, 0x250000] # 스티커 디자인 넘기는 좌우 방향키

for effect in effects:
    icons = os.listdir(os.path.join(icon_root, effect))
    effect_icons[effect] = icons
    
for file in files:
    icon = cv2.imread(os.path.join(num_icon_root, file))
    icon = cv2.resize(icon, (30, 30))
    num_icons.append(icon)

for button_file in button_files:
    button = cv2.imread(os.path.join(button_icon_root, button_file))
    button = cv2.resize(button, (40, 40))
    button_icons.append(button)


# face mesh에서 landmark 추출
def get_landmarks(image):
    landmarks = []
    height, width = image.shape[0:2]
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    face_mesh_results = face_mesh.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    if face_mesh_results.multi_face_landmarks:
        for face_landmarks in face_mesh_results.multi_face_landmarks:
            current = {}
            for i, landmark in enumerate(face_landmarks.landmark):
                x = landmark.x
                y = landmark.y
                relative_x = int(x * width)
                relative_y = int(y * height)
                current[i + 1] = (relative_x, relative_y)
            landmarks.append(current)
            
    return landmarks


# landmark와 얼굴 부위 연결
def get_effect_cordinates(landmarks):
    effect_cordinates = {
        "eye_left": (landmarks[30], (landmarks[158][0], landmarks[145][1])),
        "eye_right": (landmarks[287], (landmarks[260][0], landmarks[381][1])),
        "shade": (landmarks[71], (landmarks[294][0], landmarks[119][1])),
        "nose": ((landmarks[51][0], landmarks[4][1]), (landmarks[281][0], landmarks[3][1])),
        "mustache": ((landmarks[148][0], landmarks[3][1]), ((landmarks[148][0]+(landmarks[3][0]-landmarks[148][0])*2), landmarks[41][1])),
        "mask": (landmarks[124], (landmarks[324][0], landmarks[153][1]))
    }
    
    return effect_cordinates


# 스티커 이미지 수정
def remove_image_whitespace(image, blend, x, y, threshold=225):
    for i in range(blend.shape[0]):
        for j in range(blend.shape[1]):
            for k in range(3):
                if blend[i][j][k] > threshold:
                    blend[i][j][k] = image[i + y][j + x][k]

# 얼굴에 스티커 부착 이전 단계
def add_effect(image, effect, icon_path, cordinates):
    item = cv2.imread(icon_path)
    pt1, pt2 = cordinates[effect]
    x, y, x_w, y_h = pt1[0], pt1[1], pt2[0], pt2[1]
    cropped = image[y:y_h, x:x_w, :]
    h, w, _ = cropped.shape
    if (h <= 0 or w <= 0 or x < 0 or y < 0 or x_w < 0 or y_h < 0):
        return 0, 0, 0, 0, 0
    item = cv2.resize(item, (w, h))
    blend = cv2.addWeighted(cropped, 0, item, 1.0, 0)
    return blend, x, y, x_w, y_h

# 스티커 디자인 변경 (좌우 방향키로 컨트롤)
def set_effect_icon(effect, step=1):
    effect_icon_counter[effect] += step
    
    if step > 0:
        if effect_icon_counter[effect] >= len(effect_icons[effect]):
            diff = abs(len(effect_icons[effect]) - effect_icon_counter[effect])
            effect_icon_counter[effect] = diff
    elif step < 0:
        if effect_icon_counter[effect] < -len(effect_icons[effect]):
            diff = abs(-len(effect_icons[effect]) - effect_icon_counter[effect])
            effect_icon_counter[effect] = len(effect_icons[effect]) - diff
    
    icon_name = effect_icons[effect][effect_icon_counter[effect]]
    icon_path = os.path.join(os.path.join(icon_root, effect), icon_name)
    current_effect_icons[effect] = icon_path


prev_display_time = 0

def calc_fps(current_display_time):
    global prev_display_time
    fps = int(1/(current_display_time - prev_display_time))
    prev_display_time = current_display_time
    
    return fps

# 좌측 메뉴에 현재 스티커 표시
def draw_status_panel_effect_icons(panel):
    for k, v in current_effect_icons.items():
        cor = status_panel_effect_icon_cordinates[k]
        if v is None:
            icon = cv2.imread(default_icon_path)
        else:
            icon = cv2.imread(current_effect_icons[k])
        icon = cv2.resize(icon, (60, 30))
        panel[cor['y']:cor["y+h"], cor['x']:cor["x+w"], :] = icon

# 얼굴에 스티커 부착
def draw_face_effects(image, cordinates):
    for effect, icon_path in current_effect_icons.items():
        if effect == "eye": # 눈 스티커 (2개라 분류)
            for effect in ["eye_left", "eye_right"]:
                if icon_path is not None:
                    blend, x, y, x_w, y_h = add_effect(image, effect, icon_path, cordinates)
                    if all([x, y, x_w, y_h]) == False:
                        continue
                    remove_image_whitespace(image, blend, x, y)
                    image[y:y_h, x:x_w, :] = blend
        else: # 다른 스티커
            if icon_path is not None:
                blend, x, y, x_w, y_h = add_effect(image, effect, icon_path, cordinates)
                if all([x, y, x_w, y_h]) == False:
                    continue
                remove_image_whitespace(image, blend, x, y)
                image[y:y_h, x:x_w, :] = blend

# 좌측 메뉴 UI
def setup_status_panel(display, fps, eye_font_col=(255, 255, 255), shade_font_col=(255, 255, 255),
                       nose_font_col=(255, 255, 255), mustache_font_col=(255, 255, 255), 
                        mask_font_col=(255, 255, 255)):
    display[368:398, 32:62, :] = num_icons[0]
    display[418:448, 32:62, :] = num_icons[1]
    display[468:498, 32:62, :] = num_icons[2]
    display[518:548, 32:62, :] = num_icons[3]
    display[568:598, 32:62, :] = num_icons[4]

    display[20:60, 115:155, :] = button_icons[2] # esc

    display[240:280, 180:220, :] = button_icons[3] # num 1,5
    display[240:280, 265:305, :] = button_icons[4]

    display[290:330, 180:220, :] = button_icons[0] # arrow key
    display[290:330, 230:270, :] = button_icons[1]

    cv2.putText(display, "Exit:", (35, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 1)
    cv2.putText(display, "Face Stickers", (35, 170), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2)
    cv2.rectangle(display, (20, 125), (325, 625), red, 2)
    cv2.putText(display, "select:      ~", (35, 270), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 1)
    cv2.putText(display, "switch:", (35, 320), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 1)
    cv2.putText(display, "Eyes", (100, 390), cv2.FONT_HERSHEY_SIMPLEX, 0.8, eye_font_col, 1)
    cv2.putText(display, "Glasses", (100, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.8, shade_font_col, 1)
    cv2.putText(display, "Nose", (100, 490), cv2.FONT_HERSHEY_SIMPLEX, 0.8, nose_font_col, 1)
    cv2.putText(display, "Mustache", (100, 540), cv2.FONT_HERSHEY_SIMPLEX, 0.8, mustache_font_col, 1)
    cv2.putText(display, "Mask", (100, 590), cv2.FONT_HERSHEY_SIMPLEX, 0.8, mask_font_col, 1)

# 전체 함수 실행 !
def app(video_source):
    global f, current_effect, thick, draw_color, bpoints, gpoints, rpoints, thickness, green_index, red_index, black_index, src_cnt, src

    pre_k = None
    
    display = np.ones((650, 1300, 3), dtype="uint8")
    prev_frame_time, current_frame_time, fps = 0, 0, 0
    source = cv2.VideoCapture(video_source, cv2.CAP_DSHOW)
    
    while True:
        ret, frame = source.read()
        frame = cv2.flip(frame, 1)

        # 얼굴 스티커 기능
        if ret:
            current_time = time.time()
            fps = calc_fps(current_time)
            #height, width, _ = frame.shape
            image = cv2.resize(frame, (950, 650))
            face_mesh_results = face_mesh.process(image)
            landmarks = get_landmarks(image)
            num_faces = len(landmarks)
            #face_detect = face_mesh_results.multi_face_landmarks

            if num_faces > 0:
                for l in landmarks:
                    cordinates = get_effect_cordinates(l)
                    draw_face_effects(image, cordinates)
            else:
                for k, v in current_effect_icons.items():
                    if v != None:
                        current_effect_icons[k] = current_effect = pre_k = None
            
            # 키보드 입력
            k = cv2.waitKeyEx(1)
            if k in effect_commands:
                if k == pre_k: # 이전 입력 번호와 같을 경우 스티커 해제
                    f = 0
                    current_effect_icons[current_effect] = current_effect = pre_k = None
                else: # 선택 스티커 번호, 이전 입력 번호 저장
                    current_effect, pre_k = effect_commands[k], k
                    f = 1
            elif k in inc_dec_commands and current_effect is not None:
                f = 0
                if k == inc_dec_commands[0]: # 좌,우 방향키로 스티커 디자인 변경
                    set_effect_icon(current_effect)
                elif k == inc_dec_commands[1]:
                    set_effect_icon(current_effect, step=-1)
            elif k == 27: # ESC 로 종료
                break

            #face mesh 그리기
            print(pre_k, k, f, current_effect_icons)
            if pre_k != None and f == 1 and face_mesh_results.multi_face_landmarks:
                if all(current_effect_icons[cur] == None for cur in current_effect_icons):
                    for faceLms in face_mesh_results.multi_face_landmarks:
                            mpDraw.draw_landmarks(image, faceLms,mp_face_mesh.FACEMESH_CONTOURS, drawSpec, drawSpec)
                            for id,lm in enumerate(faceLms.landmark):
                                ih, iw, ic = image.shape
                                x,y = int(lm.x*iw), int(lm.y*ih)
            
            display[:, 350:, :] = image  
            status_panel = np.zeros((650, 350, 3))
            draw_status_panel_effect_icons(status_panel)
            display[:, :350, :] = status_panel
            
            if current_effect is None:
                setup_status_panel(display, fps)
            elif current_effect == "eye":
                setup_status_panel(display, fps, eye_font_col=(0, 0, 255))
            elif current_effect == "shade":
                setup_status_panel(display, fps, shade_font_col=(0, 0, 255))
            elif current_effect == "nose":
                setup_status_panel(display, fps, nose_font_col=(0, 0, 255))
            elif current_effect == "mustache":
                setup_status_panel(display, fps,  mustache_font_col=(0, 0, 255))
            elif current_effect == "mask":
                setup_status_panel(display, fps,  mask_font_col=(0, 0, 255))
        else:
            break


        # 필기 기능
        imgRGB = cv2.cvtColor(display, cv2.COLOR_BGR2RGB) # BGR to RGB
        # imgRGB에 대하여 손이 있는지 mediapipe 연산을 통하여 찾는다
        results = hands.process(imgRGB) # searching for a hand
        hand_detect = results.multi_hand_landmarks

        #text 오른쪽 (가로-오른쪽방향, 세로-아래방향)
        cv2.putText(display, "Date: " + date.today().strftime("%Y%m%d"), (1300-350, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2)
        cv2.putText(display, "Thickness : " + str(thick), (1300-350, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2)
        cv2.putText(display, "Pen color: ", (1300-350, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2) # 색깔
        cv2.circle(display, (1300-150, 140), 15, green, -1)
        cv2.circle(display, (1300-100, 140), 15, black, -1)
        cv2.circle(display, (1300-50, 140), 15, red, -1)
        
        c_w = 1300-150
        if( draw_color == black ): c_w = 1300-100
        if( draw_color == red ): c_w = 1300-50
        cv2.circle(display, (c_w, 140), 18, white, 3)

        cv2.putText(display, "face num: " + str(num_faces), (35, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.8, white, 1)
        cv2.circle(display, (185, 210-7), 15, (255, 0, 0), 2)

        cv2.putText(display, "Hand detect: " + str(bool(hand_detect)), (1300-350, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2) # 손 측정

        flag = 1
        # 손을 찾았다면 OK
        if hand_detect: # if the hand is found
            # !추후에 여러 손도 가능하게 도입하기 위하여 우선 손마다 연산을 가능하게 하였다
            for handLms in hand_detect: # for each hand
                # mediapipe 에서 제공하는 손 module 전부 받기
                lmList = [] #hands list 0 to 20
                for id in enumerate(handLms.landmark):
                    cx, cy = handLms.landmark[id[0]].x, handLms.landmark[id[0]].y
                    lmList.append([id[0], cx, cy])
                if len(lmList) != 0: #if recognized well
                    fingers = []
                    # !is thumb up 
                    # 엄지가 Open 되어 있는지 확인하는 연산
                    # mediapipe 에서 제공해주는 대로 사용
                    # 2번째 마디보다 바깥에 있다면 펴져있다고 판정
                    # 만약 열려있다면, 총 개수에서 추가
                    #오른손일 때
                    if lmList[2][1] > lmList[18][1]:
                        if lmList[4][1] > lmList[3][1]:
                            fingers.append(1)
                        else:
                            fingers.append(0)
                    #왼손일 때
                    else:
                        if lmList[4][1] < lmList[3][1]:
                            fingers.append(1)
                        else:
                            fingers.append(0)
                    # !is other fingers up
                    # 2~5 번쨰 손가락들에 대한 연산
                    # 마찬가지로 mediapipe 에 대한 연산으로 실행
                    # 2~5 번째 손가락은 마디가 3개 이므로
                    # 3번쨰 마디보다 바깥에 있다면 손가락이 펴졌다고 판정
                    for id in range(1, 5):
                        if lmList[tipIds[id]][2] < lmList[tipIds[id] - 2][2]:
                            fingers.append(1)
                        else:
                            fingers.append(0)
                    # total fingers
                    totalFingers = fingers.count(1)
                    
                    # 손가락 개수에 따른 연산과정
                    if (totalFingers == 0): #screenshot
                        function = "screenshot"
                        if (src == 0):
                            # pyautogui.screenshot().save('../screenshot/' + date.today().strftime("%Y%m%d") + str(src_cnt) + '.png')
                            screen_shot()
                            src_cnt += 1
                        src = 1

                    elif (totalFingers == 1): #draw
                        function = "draw"
                        src = 0
                        if cv2.waitKeyEx(1) == 32:
                            pass
                        else:
                            flag = 0

                    elif (totalFingers == 2): #pause
                        function = "pause"
                        src = 0

                    elif (totalFingers == 3): #thickness change (10->20->30->5->10..)
                        function = "thickness"
                        if (src != 2):
                            if thickness == 10:
                                thickness = 25
                                thick = "3"
                            elif thickness == 25:
                                thickness = 45
                                thick = "4"
                            elif thickness == 45:
                                thickness = 2
                                thick = "1"
                            else:
                                thickness = 10
                                thick = "2"
                        src = 2

                    elif (totalFingers == 4): #color change (g->b->r->g..)
                        function = "color"
                        if (src != 3):
                            if draw_color == green:
                                draw_color = black
                                draw_color_str = "black"
                            elif draw_color == black:
                                draw_color = red
                                draw_color_str = "red"
                            else:
                                draw_color = green
                                draw_color_str = "green"
                        src = 3

                    elif (totalFingers == 5): #clear
                        #draw_color = black
                        # 이때까지 쌓았던 RGB points 들을 다시 reset 해준다
                        function = "clear"
                        src = 0
                        print('clear')
                        bpoints = [deque(maxlen=512)]
                        gpoints = [deque(maxlen=512)]
                        rpoints = [deque(maxlen=512)]
                        thickpoints = [deque(maxlen=1024)]

                        black_index = 0
                        green_index = 0
                        red_index = 0

                    print(totalFingers)
                    
                    cv2.putText(display, "Finger Count: "+str(totalFingers), (1300-350, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2)
                    cv2.putText(display, "Func: "+function, (1300-350, 300), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2)

                else: # 손을 제대로 인식하지 못했을 경우 그냥 탈출
                    break

                mpDraw.draw_landmarks(display, handLms, mpHands.HAND_CONNECTIONS)
                # 실제 화면에 대해서 x, y를 연산
                index_lm_x = handLms.landmark[8].x # x for 2nd finger
                index_lm_y = handLms.landmark[8].y # y for 2nd finger

                # 손가락 1개가 아니라면
                # 현상태를 유지하면서, 나의 위치는 다음번에 사용하기 위해
                # 이전 (px, py) 로 사용한다
                if (flag) : # finger is not 1
                    px = int(1300 * (1 - index_lm_x))
                    py = int(650 * index_lm_y)
                    bpoints.append(deque(maxlen=512))
                    black_index += 1
                    gpoints.append(deque(maxlen=512))
                    green_index += 1
                    rpoints.append(deque(maxlen=512))
                    red_index += 1

                    break

                # 손가락이 1개인 경우
                # 나의 위치에서 (px, py) 로 그림을 과정이 필요하다
                nx, ny = int(index_lm_x * 1300), int(index_lm_y * 625) # relative xy pos
                cv2.putText(display, "Pen pos. ("+str(nx)+","+str(ny)+")", (1300-350, 350), cv2.FONT_HERSHEY_SIMPLEX, 1, black, 2)

                center = (nx, ny, thickness)
                if draw_color == black:
                    bpoints[black_index].appendleft(center)
                elif draw_color == green:
                    gpoints[green_index].appendleft(center)
                elif draw_color == red:
                    rpoints[red_index].appendleft(center)

                # cv2.circle(img, (nx, ny), 10, (255, 0, 0), 5, cv2.FILLED) #draw

                # 현재의 위치는 다음번의 전에 사용했던 좌표가 되므로
                # px, py 로 선언해주어 다음에 사용가능
                px = int(1080 * index_lm_x)
                py = int(720 * index_lm_y)

        else:
            cont == 0
  
        points = [bpoints, gpoints, rpoints]
        colors = [black, green, red]
        # 이때까지 쌓아두었던 points 들에 대한 연산
        # 실제로 화면에 뿌려주기 전에 쌓여있던 데이터들을 연산해준다
        for i in range(len(points)):
            for j in range(len(points[i])):
                for k in range(1, len(points[i][j])-1):
                    if points[i][j][k - 1] is None or points[i][j][k] is None:
                        continue
                    cv2.line(display, points[i][j][k - 1][:2], points[i][j][k][:2], colors[i], points[i][j][k-1][2])

        cv2.imshow("HandDeco", display)

        # 키보드 입력
        k = cv2.waitKeyEx(1)
        if k in effect_commands:
            if k == pre_k: # 이전 입력 번호와 같을 경우 스티커 해제
                current_effect_icons[current_effect] = current_effect = pre_k = None
            else: # 선택 스티커 번호, 이전 입력 번호 저장
                current_effect, pre_k = effect_commands[k], k
            
        elif k in inc_dec_commands and current_effect is not None:
            if k == inc_dec_commands[0]: # 좌,우 방향키로 스티커 디자인 변경
                set_effect_icon(current_effect)
            elif k == inc_dec_commands[1]:
                set_effect_icon(current_effect, step=-1)
        elif k == 27: # ESC 로 종료
            break


    source.release()
    cv2.destroyAllWindows()

def screen_shot():
    import pygetwindow
    import time
    import pyautogui
    import PIL
     #first find window

    my = pygetwindow.getWindowsWithTitle('HandDeco')[0] 

    x, y = my.topleft
    x2, y2 = my.bottomright

    # save screenshot
    p = pyautogui.screenshot()
    s = date.today().strftime("%Y%m%d")
    p.save('../screenshot/' + s + str(src_cnt) + '.png') 

    # edit screenshot
    im = PIL.Image.open('../screenshot/' + s + str(src_cnt) + '.png')
    im_crop = im.crop((x+7, y, x2-7, y2-7))
    im_crop.save('../screenshot/' + s + str(src_cnt) + '.png')

app(0)