import os
import zipfile
import mimetypes

base_dir = r"D:\Antigravity projetos meus\Gestão de Documentos escolas\Livro_Estudo_Ativo"
html_path = os.path.join(base_dir, "livro_diagramado_kdp.html")
epub_path = os.path.join(base_dir, "Estudo_Ativo_eBook_Kindle.epub")
images_dir = os.path.join(base_dir, "images")

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

mimetype = b"application/epub+zip"

container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>"""

# List images to add to manifest
image_files = sorted(os.listdir(images_dir))
manifest_items = [
    '<item id="toc" href="toc.xhtml" properties="nav" media-type="application/xhtml+xml"/>',
    '<item id="book" href="book.xhtml" media-type="application/xhtml+xml"/>'
]

for img in image_files:
    ext = os.path.splitext(img)[1].lower()
    media_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
    item_id = "img_" + os.path.splitext(img)[0]
    manifest_items.append(f'<item id="{item_id}" href="images/{img}" media-type="{media_type}"/>')

manifest_str = "\n        ".join(manifest_items)

content_opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Estudo Ativo: Hackeando o Aprendizado</dc:title>
        <dc:creator>Walter Santos</dc:creator>
        <dc:language>pt-BR</dc:language>
        <dc:identifier id="BookId">urn:uuid:98765432-1234-5678-1234-567812345678</dc:identifier>
        <meta property="dcterms:modified">2026-11-18T12:00:00Z</meta>
    </metadata>
    <manifest>
        {manifest_str}
    </manifest>
    <spine>
        <itemref idref="toc"/>
        <itemref idref="book"/>
    </spine>
</package>"""

toc_xhtml = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="pt-BR">
<head>
    <title>Sumário</title>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>Sumário</h1>
        <ol>
            <li><a href="book.xhtml#introducao">Introdução</a></li>
            <li><a href="book.xhtml#o-que-e-aprender">O que é aprender?</a></li>
            <li><a href="book.xhtml#importancia-estudo-ativo">O que é, e qual a importância do Estudo Ativo</a></li>
            <li><a href="book.xhtml#neurociencia-aprendizado">A Neurociência aplicada ao aprendizado</a></li>
            <li><a href="book.xhtml#mindset-crescimento">Mindset de crescimento para o Aprendizado</a></li>
            <li><a href="book.xhtml#pausa-estrategica">Pausa Estratégica</a></li>
            <li><a href="book.xhtml#definicao-estudo-ativo">O que é o estudo ativo?</a></li>
            <li><a href="book.xhtml#tecnicas-estudo-ativo">Técnicas de estudo ativo</a></li>
            <li><a href="book.xhtml#active-recall">Active Recall</a></li>
            <li><a href="book.xhtml#tecnica-feynman">Técnica de Feynman</a></li>
            <li><a href="book.xhtml#flashcards">Técnica dos Flashcards</a></li>
            <li><a href="book.xhtml#leituras-intercaladas">Leituras Intercaladas</a></li>
            <li><a href="book.xhtml#pomodoro">Técnica Pomodoro</a></li>
            <li><a href="book.xhtml#recomendacoes-finais">Recomendações finais</a></li>
            <li><a href="book.xhtml#referencias">Referências bibliográficas</a></li>
            <li><a href="book.xhtml#sobre-autor">Sobre o Autor</a></li>
        </ol>
    </nav>
</body>
</html>"""

xhtml_content = html_content.replace("&copy;", "©")

with zipfile.ZipFile(epub_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("mimetype", mimetype, compress_type=zipfile.ZIP_STORED)
    zf.writestr("META-INF/container.xml", container_xml)
    zf.writestr("OEBPS/content.opf", content_opf)
    zf.writestr("OEBPS/toc.xhtml", toc_xhtml)
    zf.writestr("OEBPS/book.xhtml", xhtml_content)
    for img in image_files:
        img_p = os.path.join(images_dir, img)
        with open(img_p, "rb") as im_data:
            zf.writestr(f"OEBPS/images/{img}", im_data.read())

print("EPUB atualizado com sucesso com todas as imagens:", epub_path, os.path.getsize(epub_path))
