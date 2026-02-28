
### To integrate html design into the framework

1. Extract all CSS from html and create css in /dashboard/themes, matching the structure of your other CSS files.
2. Add a new css entry to dashboard-designs.js, so the dashboard logic recognizes and uses new css and its themes.
3. Update the dashboard HTML generator to inject the correct Google Fonts <link> tags in the <head> when the new design is selected.
4. Ensure dashboard HTML generator, dashboard logic, and all scripts work with this new CSS.
5. Add theme classes (body.theme-pink, body.theme-cyan, etc.) to new css for theme switching.
6. Ensure the accordions work by using the shared dashboard-logic.js.
7. Remove any inline JS/CSS from the HTML and rely on the shared logic.
8. Ensure theme switching works
9. Ensure the accordions work
10. Ensure the header, dropdown, accordions everything match with the original html
