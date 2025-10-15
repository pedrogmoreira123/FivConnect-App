// Design tokens centralizados
export const designTokens = {
  colors: {
    priority: {
      low: 'hsl(142 71% 45%)',      // Verde
      medium: 'hsl(45 93% 47%)',    // Amarelo  
      high: 'hsl(25 95% 53%)',      // Laranja
      urgent: 'hsl(0 84% 60%)'      // Vermelho
    },
    status: {
      open: 'hsl(217 91% 60%)',
      inProgress: 'hsl(45 93% 47%)',
      closed: 'hsl(142 71% 45%)',
      canceled: 'hsl(215 16% 47%)'
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem'    // 48px
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem'
  }
}
