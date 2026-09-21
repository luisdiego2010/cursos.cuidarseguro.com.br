#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.rglob('*.html'))

FORBIDDEN_PATTERNS = {
    'client-side auth list': re.compile(r'EMAILS_AUTORIZADOS', re.I),
    'client-side auth flag': re.compile(r'instrutor_auth|sessionStorage', re.I),
    'client-side login handler': re.compile(r'function\s+doLogin|onclick=["\']doLogin', re.I),
    'password input': re.compile(r'type=["\']password["\']', re.I),
    'old shared password': re.compile(r'sba@imers', re.I),
    'restricted question-bank file': re.compile(r'SP-ANEST-001-Banco-de-Questoes|SP-ANEST-001-Banco-de-Questões', re.I),
    'restricted answer key': re.compile(r'Gabarito dos testes', re.I),
    'restricted simulator setup': re.compile(r'Setup\s*\(Instrutor', re.I),
    'restricted sharing warning': re.compile(r'NÃO devem ser compartilhados', re.I),
}

REQUIRED_PAGES = [
    ROOT / 'index.html',
    ROOT / 'sp-anest-001/index.html',
    ROOT / 'sp-anest-001/participantes/index.html',
    ROOT / 'sp-anest-001/instrutores/index.html',
    ROOT / 'privacidade/index.html',
    ROOT / 'acessibilidade/index.html',
    ROOT / '404.html',
    ROOT / 'robots.txt',
    ROOT / 'sitemap.xml',
]

class Inspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[str] = []
        self.lang: str | None = None
        self.title_seen = False
        self.h1_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == 'html':
            self.lang = values.get('lang')
        elif tag == 'title':
            self.title_seen = True
        elif tag == 'h1':
            self.h1_count += 1
        if values.get('id'):
            self.ids.append(values['id'] or '')
        if tag == 'a' and values.get('href'):
            self.links.append(values['href'] or '')


def resolve_internal(source: Path, href: str) -> Path | None:
    parsed = urlparse(href)
    if parsed.scheme or parsed.netloc or href.startswith(('mailto:', 'tel:', '#')):
        return None
    clean = parsed.path
    if not clean:
        return None
    if clean.startswith('/'):
        target = ROOT / clean.lstrip('/')
    else:
        target = source.parent / clean
    target = target.resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        return target
    if target.is_dir() or clean.endswith('/'):
        target = target / 'index.html'
    elif not target.suffix:
        target = target / 'index.html'
    return target


def main() -> int:
    errors: list[str] = []

    for path in REQUIRED_PAGES:
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f'Página obrigatória ausente ou vazia: {path.relative_to(ROOT)}')

    for path in HTML_FILES:
        text = path.read_text(encoding='utf-8')
        rel = path.relative_to(ROOT)
        parser = Inspector()
        try:
            parser.feed(text)
        except Exception as exc:
            errors.append(f'{rel}: HTML não pôde ser analisado: {exc}')
            continue
        if parser.lang != 'pt-BR':
            errors.append(f'{rel}: lang deve ser pt-BR')
        if not parser.title_seen:
            errors.append(f'{rel}: elemento title ausente')
        if parser.h1_count != 1:
            errors.append(f'{rel}: esperado exatamente um h1; encontrado {parser.h1_count}')
        duplicate_ids = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicate_ids:
            errors.append(f'{rel}: IDs duplicados: {duplicate_ids}')
        for label, pattern in FORBIDDEN_PATTERNS.items():
            if pattern.search(text):
                errors.append(f'{rel}: marcador proibido encontrado ({label})')
        for href in parser.links:
            target = resolve_internal(path, href)
            if target is not None and not target.exists():
                errors.append(f'{rel}: link interno quebrado {href} -> {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}')

    public_text = '\n'.join((ROOT / rel).read_text(encoding='utf-8') for rel in [
        'sp-anest-001/index.html',
        'sp-anest-001/participantes/index.html',
    ])
    required_phrases = [
        '08h00–17h00',
        '7h45 efetivas',
        '15 minutos de intervalo',
        '60 minutos de almoço',
        'sem nota',
        'sem aprovação/reprovação',
        '10 questões',
    ]
    for phrase in required_phrases:
        if phrase.casefold() not in public_text.casefold():
            errors.append(f'Informação pública obrigatória ausente: {phrase}')

    if errors:
        print(f'FALHA — {len(errors)} problema(s)')
        for index, error in enumerate(errors, 1):
            print(f'{index}. {error}')
        return 1

    print(f'OK — {len(HTML_FILES)} páginas HTML validadas; sem segredos, links quebrados ou incoerências configuradas.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
