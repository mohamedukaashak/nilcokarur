/** @type {import('tailwindcss').Config} */

module.exports = {
	darkMode: 'class',
	content: ['./src/**/*.html', './src/**/*.js'],
	theme: {
		container: {
			center: true,
			padding: '1rem',
			screens: {
				'2xl': '1320px',
			},
		},
		fontFamily: {
			sans: ['"Google Sans"', '"Product Sans"', '"Inter"', 'sans-serif'],
		},
		fontSize: {
			sm: '0.75rem',
			base: '0.875rem',
			md: '1.125rem',
			lg: '1.5rem',
			xl: '1.75rem',
			'2xl': '2rem',
			'3xl': '2.5rem',
			'4xl': '2.441rem',
			'5xl': '3.052rem',
		},

		extend: {
			flex: {
				0: '0 0 auto',
			},

			colors: {
				white: '#ffffff',
				gray: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a',
					950: '#020617',
				},
				// Lightened, vibrant modern yellow / luminous sunshine palette
				yellow: {
					50: '#fffef0',
					100: '#fefce8',
					200: '#fef9c3',
					300: '#fef08a',
					400: '#fde047',
					500: '#facc15',
					600: '#eab308',
					700: '#ca8a04',
					800: '#a16207',
					900: '#854d0e',
					950: '#422006',
				},
				// Fallback green alias mapped to lightened yellow for consistency
				green: {
					50: '#fffef0',
					100: '#fefce8',
					200: '#fef9c3',
					300: '#fef08a',
					400: '#fde047',
					500: '#facc15',
					600: '#facc15',
					700: '#eab308',
					800: '#ca8a04',
					900: '#a16207',
					950: '#422006',
				},
			},
			maxWidth: {
				'screen-xs': '300px',
			},
		},
	},
	variants: {},
	plugins: [
		require('@tailwindcss/forms')({
			strategy: 'base',
		}),
		require('@tailwindcss/typography'),
	],
};
