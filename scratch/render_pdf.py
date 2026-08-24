import pymupdf

pdf_path = r'c:\Users\USER\Downloads\Project\Predictive-Material-System\新增資料夾\原料\塑膠原料資料表.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(dpi=150)
pix.save('scratch/page1.png')
print('Saved page1.png successfully')
