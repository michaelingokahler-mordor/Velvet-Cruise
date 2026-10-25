"""Contact sheets for visual QA; source game art is never changed."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/plus'
font=ImageFont.load_default(size=12)
sheet=Image.new('RGB',(1280,192*4),'#181724');draw=ImageDraw.Draw(sheet)
for i,folder in enumerate(sorted((OUT/'stages').glob('[0-9][0-9]-*'))):
    image=Image.open(folder/'plus-04.png').convert('RGB').resize((320,180),Image.Resampling.NEAREST)
    x=i%4*320;y=i//4*192;sheet.paste(image,(x,y+12));draw.text((x+4,y),folder.name,fill='#fff0ba',font=font)
sheet.save(OUT/'stages/contact-sheet.png')
sheet=Image.new('RGB',(184*8,112*6),'#65616a');draw=ImageDraw.Draw(sheet)
for row,prefix in enumerate(['player','player_yellow','player_green','player_blue','player_silver','player_azure']):
    for phase,suffix in enumerate(['','_roof1','_roof2','_roof3','_roof4','_roof5','_roof6','_closed']):
        image=Image.open(ROOT/f'tools/art/plus/out/{prefix}{suffix}_straight_0.png').convert('RGBA')
        x=phase*184;y=row*112;sheet.paste(image,(x+4,y+16),image)
        draw.text((x+4,y+2),prefix if phase==0 else str(phase),fill='#fff1d0',font=font)
sheet.save(OUT/'stages/cars-roofs.png')
print('Created stage and six-car/eight-roof contact sheets')
