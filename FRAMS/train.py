import cv2, os, numpy as np

dataset = "dataset"

faces=[]
labels=[]
label_map={}
label_id=0

for person in os.listdir(dataset):

    path = os.path.join(dataset, person)
    if not os.path.isdir(path):
        continue

    label_map[label_id]=person

    for img in os.listdir(path):
        img_path=os.path.join(path,img)

        image=cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        faces.append(image)
        labels.append(label_id)

    label_id+=1

recognizer=cv2.face.LBPHFaceRecognizer_create()
recognizer.train(faces,np.array(labels))
recognizer.save("trainer.yml")

np.save("labels.npy",label_map)

print("✅ Training completed")
