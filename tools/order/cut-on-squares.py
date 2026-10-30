"""
판 칸(철판) 위에 그려 온 제미나이 시트 자르기 (D-056): 칸마다 철판 색을 지우고, 기준 폰 높이를 17도트로 잡아 그 간격으로 도트를 뽑는다.
사용: python3 -I tools/order/cut-on-squares.py <시트.png> <출력 폴더>
"""
import sys
from collections import deque
import numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
out_dir=sys.argv[2]
h,w,_=a.shape
mag=(a[...,0]>180)&(a[...,2]>180)&(a[...,1]<120)
def segs(v,minl=100):
    out=[];x=0
    while x<len(v):
        if v[x]:
            s=x
            while x<len(v) and v[x]: x+=1
            if x-s>minl: out.append((s,x))
        x+=1
    return out
names=['pawn','scrap','lift','shield','trap','screwbox']
rows=segs(~mag[:,100])
sheet=[]
for r,(y0,y1) in enumerate(rows):
    cs=segs(~mag[(y0+y1)//2])
    items={}
    for n,(s,e) in zip(names,cs):
        sub=a[y0+6:y1-6,s+6:e-6]
        plate=np.median(sub[:10,:10].reshape(-1,3),0)
        d=np.abs(sub-plate).sum(-1)>60
        yy,xx=np.nonzero(d)
        items[n]=sub[yy.min():yy.max()+1, xx.min():xx.max()+1], d[yy.min():yy.max()+1, xx.min():xx.max()+1]
    ph=items['pawn'][0].shape[0]
    pitch=ph/17.0
    for n,(img,m) in items.items():
        H,W=m.shape
        nx,ny=max(1,round(W/pitch)),max(1,round(H/pitch))
        px,py=W/nx,H/ny
        im=Image.new('RGBA',(nx,ny),(0,0,0,0))
        for j in range(ny):
            for i in range(nx):
                ys=slice(int(j*py+py*.3),max(int(j*py+py*.3)+1,int(j*py+py*.7)))
                xs=slice(int(i*px+px*.3),max(int(i*px+px*.3)+1,int(i*px+px*.7)))
                if m[ys,xs].mean()>=0.5:
                    c=np.median(img[ys,xs][m[ys,xs]],0)
                    im.putpixel((i,j),tuple(int(v) for v in c)+(255,))
        im.save(f'{out_dir}/{n}-{r+1}.png'); sheet.append((r,n,im))
        print(r+1,n,nx,'x',ny)
pv=Image.new('RGBA',(26*6,26*len(rows)),(60,60,70,255))
for r,n,im in sheet:
    k=names.index(n); pv.alpha_composite(im,(k*26+(26-im.width)//2,r*26+26-im.height-1))
pv.resize((pv.width*5,pv.height*5),Image.NEAREST).save(f'{out_dir}/_preview.png')
