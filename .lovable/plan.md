

# Ajuste de Cores da Marca e Favicon

## 1. Paleta de Cores (baseada no logo roxo/violeta)

A paleta será migrada de Slate/Zinc para tons de roxo/violeta, extraídos do logo da marca:

- **Primary**: Roxo escuro profundo (similar ao "t" do logo, ~262 70% 23%)
- **Primary foreground**: Branco
- **Accent/Secondary**: Lavanda claro (similar ao fundo do logo, ~270 40% 92%)
- **Ring/Focus**: Roxo médio
- **Sidebar**: Tons de roxo escuro

### Cores de Alertas (Auditoria)
- **Destructive (Alta severidade)**: Vermelho forte -- mantido para alertas criticos
- **Warning (Media severidade)**: Laranja/Amber -- mantido para chamar atenção
- **Success (Positivo)**: Verde -- mantido
- **Info (novo)**: Azul claro para informações neutras

As cores nos graficos do Dashboard (barras e pizza) tambem serao atualizadas para usar tons de roxo como cor principal.

## 2. Favicon

Sera gerada uma imagem de favicon (lupa auditando folha de papel) via AI image generation e configurada no `index.html`. O titulo da pagina tambem sera atualizado para "Auditoria de Folha".

## 3. Arquivos Alterados

- `src/index.css` -- nova paleta de variaveis CSS (light e dark)
- `src/pages/Dashboard.tsx` -- cores dos graficos Recharts atualizadas para tons de roxo
- `src/pages/PinAccess.tsx` -- icone e estilo do card com cor primaria roxa
- `src/components/Layout.tsx` -- header com tom de roxo
- `index.html` -- favicon + titulo atualizado
- `public/favicon.svg` -- novo favicon gerado (lupa + folha)

## Detalhes Tecnicos

### Paleta CSS (light mode)
```
--primary: 267 70% 23%        (roxo escuro profundo)
--primary-foreground: 0 0% 100%
--secondary: 270 40% 94%      (lavanda bem claro)
--secondary-foreground: 267 70% 23%
--accent: 270 35% 92%         (lavanda)
--accent-foreground: 267 70% 23%
--muted: 270 20% 93%
--muted-foreground: 267 15% 46%
--ring: 267 70% 40%
--border: 270 20% 90%
--input: 270 20% 90%
```

### Paleta CSS (dark mode)
```
--primary: 270 60% 78%        (roxo claro)
--primary-foreground: 267 70% 10%
--secondary: 267 30% 17%
--accent: 267 30% 17%
--card: 267 40% 8%
--background: 267 40% 6%
```

### Cores dos graficos Recharts
Array COLORS atualizado para tons de roxo degradando ate complementares.

