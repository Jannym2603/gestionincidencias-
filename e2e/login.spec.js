const { test, expect } = require('@playwright/test');


test(
    'debe abrir la pantalla de inicio de sesión',
    async ({ page }) => {

        await page.goto(
            'http://localhost:8081/login.html'
        );

        await expect(
            page
        ).toHaveURL(
            /login\.html/
        );
    }
);


test(
    'debe mostrar el formulario de inicio de sesión',
    async ({ page }) => {

        await page.goto(
            'http://localhost:8081/login.html'
        );

        const correo =
            page.locator('#correo');

        const password =
            page.locator('#password');

        const botonLogin =
            page.getByRole(
                'button',
                {
                    name: /entrar al sistema/i
                }
            );

        await expect(
            correo
        ).toBeVisible();

        await expect(
            password
        ).toBeVisible();

        await expect(
            botonLogin
        ).toBeVisible();
    }
);


test(
    'debe impedir iniciar sesión con campos vacíos',
    async ({ page }) => {

        await page.goto(
            'http://localhost:8081/login.html'
        );

        const correo =
            page.locator('#correo');

        const password =
            page.locator('#password');

        const botonLogin =
            page.getByRole(
                'button',
                {
                    name: /entrar al sistema/i
                }
            );

        await expect(
            correo
        ).toHaveValue('');

        await expect(
            password
        ).toHaveValue('');

        await botonLogin.click();

        await expect(
            page
        ).toHaveURL(
            /login\.html/
        );

        const correoInvalido =
            await correo.evaluate(
                elemento =>
                    !elemento.checkValidity()
            );

        expect(
            correoInvalido
        ).toBe(true);


        const passwordInvalido =
            await password.evaluate(
                elemento =>
                    !elemento.checkValidity()
            );

        expect(
            passwordInvalido
        ).toBe(true);
    }
);