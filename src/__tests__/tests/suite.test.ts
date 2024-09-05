import { I18N } from '../../gettext';

describe('gettext-ts test suite', () => {
    describe('General API', function () {
        it('should have default locale', function () {
            const i18n = new I18N();
            expect(i18n.getLocale()).toBe('en');
        });

        it('should allow to set locale', function () {
            const i18n = new I18N({ locale: 'fr' });
            expect(i18n.getLocale()).toBe('fr');
        });

        it('should allow to set messages', function () {
            const i18n = new I18N({
                locale: 'fr',
                messages: { 'apple': 'pomme' }
            });
            expect(i18n.getLocale()).toBe('fr');
            expect(i18n.gettext('apple')).toBe('pomme');
        });

        it('should handle contextualized msgid', function () {
            const i18n = new I18N({
                locale: 'fr',
                plural_forms: 'nplurals=2; plural=n>1;',
                messages: {
                    'foo': 'bar',
                    'ctxt\u0004foo': 'baz',
                    'There is %1 apple': [
                        'Il y a %1 pomme',
                        'Il y a %1 pommes'
                    ],
                    'ctxt\u0004There is %1 apple': [
                        'Il y a %1 pomme Golden',
                        'Il y a %1 pommes Golde'
                    ],
                }
            });
            expect(i18n.gettext('foo')).toBe('bar');
            expect(i18n.gettext('ctxt\u0004foo')).toBe('baz');
            expect(i18n.gettext('ctxt\u0004baz')).toBe('baz');
            expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 2, 2)).toBe('Il y a 2 pommes');
            expect(i18n.ngettext('ctxt\u0004There is %1 apple', 'There are %1 apples', 1, 1)).toBe('Il y a 1 pomme Golden');
            expect(i18n.ngettext('ctxt\u0004There is %1 orange', 'There are %1 oranges', 1, 1)).toBe('There is 1 orange');
            expect(i18n.ngettext('ctxt\u0004There is %1 orange', 'There are %1 oranges', 3, 3)).toBe('There are 3 oranges');
        });
    });

    describe('methods', () => {
        let i18n = new I18N();

        describe('strfmt', function () {
            it('should handle one replacement', function () {
                expect(i18n.strfmt('foo %1 baz', 'bar')).toBe('foo bar baz');
            });
            it('should handle many replacements', function () {
                expect(i18n.strfmt('foo %1 baz %2', 'bar', 42)).toBe('foo bar baz 42');
            });
            it('should handle order', function () {
                expect(i18n.strfmt('foo %2 baz %1', 'bar', 42)).toBe('foo 42 baz bar');
            });
            it('should handle repeat', function () {
                expect(i18n.strfmt('foo %1 baz %1', 'bar', 42)).toBe('foo bar baz bar');
            });
            it('should handle literal percent (%) signs', function () {
                expect(i18n.strfmt('foo 1%% bar')).toBe('foo 1% bar');
                expect(i18n.strfmt('foo %1%% bar', 10)).toBe('foo 10% bar');
                expect(i18n.strfmt('foo %%1 bar')).toBe('foo %1 bar');
                expect(i18n.strfmt('foo %%%1 bar', 10)).toBe('foo %10 bar');
            });
        });

        describe('expand_locale', function () {
            it('should handle simple locale', function () {
                expect(i18n.expand_locale('fr')).toStrictEqual(['fr']);
            });
            it('should handle complex locale', function () {
                expect(i18n.expand_locale('de-CH-1996')).toStrictEqual(['de-CH-1996', 'de-CH', 'de']);
            });
        });

        describe('gettext', function () {
            it('should handle peacefully singular untranslated keys', function () {
                expect(i18n.gettext('not translated')).toBe('not translated');
            });
            it('should handle peacefully singular untranslated keys with extra', function () {
                expect(i18n.gettext('not %1 translated', 'correctly')).toBe('not correctly translated');
                expect(i18n.gettext('not %1 %2 translated', 'fully', 'correctly')).toBe('not fully correctly translated');
            });
            it('should fallback to father language', function () {
                i18n = new I18N();
                i18n.setMessages('messages', 'fr', {
                    'Mop': 'Serpillière',
                });
                i18n.setMessages('messages', 'fr-BE', {
                    'Mop': 'Torchon',
                });

                i18n.setLocale('fr-BE');
                expect(i18n.gettext('Mop')).toBe('Torchon');

                i18n.setLocale('fr');
                expect(i18n.gettext('Mop')).toBe('Serpillière');

                i18n.setLocale('fr-FR');
                expect(i18n.gettext('Mop')).toBe('Serpillière');
            });
        });

        describe('ngettext', function () {
            it('should handle peacefully plural untranslated keys', function () {
                // english default plural rule is n !== 1
                expect(i18n.ngettext('%1 not translated singular', '%1 not translated plural', 0, 0)).toBe('0 not translated plural');
                expect(i18n.ngettext('%1 not translated singular', '%1 not translated plural', 1, 1)).toBe('1 not translated singular');
                expect(i18n.ngettext('%1 not translated singular', '%1 not translated plural', 3, 3)).toBe('3 not translated plural');
            });

            it('should handle peacefully plural untranslated keys with extra', function () {
                expect(i18n.ngettext('%1 not %2 singular', '%1 not %2 plural', 1, 1, 'foo')).toBe('1 not foo singular');
                expect(i18n.ngettext('%1 not %2 singular', '%1 not %2 plural', 3, 3, 'foo')).toBe('3 not foo plural');
            });
            it('should use default english plural form for untranslated keys', function () {
                i18n = new I18N({ locale: 'fr', plural_forms: 'nplurals=2; plural=n>1;' });
                expect(i18n.ngettext('%1 not translated singular', '%1 not translated plural', 0, 0)).toBe('0 not translated plural');
                expect(i18n.ngettext('%1 not translated singular', '%1 not translated plural', 1, 1)).toBe('1 not translated singular');
                expect(i18n.ngettext('%1 not translated singular', '%1 not translated plural', 3, 3)).toBe('3 not translated plural');
            });
            it('should handle correctly other language plural passed through setMessages method', function () {
                i18n = new I18N({ locale: 'fr' });
                i18n.setMessages('messages', 'fr', {
                    'There is %1 apple': [
                        'Il y a %1 pomme',
                        'Il y a %1 pommes'
                    ]
                }, 'nplurals=2; plural=n>1;');
                expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 0, 0)).toBe('Il y a 0 pomme');
                expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 1, 1)).toBe('Il y a 1 pomme');
                expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 2, 2)).toBe('Il y a 2 pommes');
            });
            it('should handle correctly other language plural passed through init options', function () {
                i18n = new I18N({
                    locale: 'fr',
                    messages: {
                        'There is %1 apple': [
                            'Il y a %1 pomme',
                            'Il y a %1 pommes'
                        ]
                    },
                    plural_forms: 'nplurals=2; plural=n>1;'
                });
                expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 0, 0)).toBe('Il y a 0 pomme');
                expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 1, 1)).toBe('Il y a 1 pomme');
                expect(i18n.ngettext('There is %1 apple', 'There are %1 apples', 2, 2)).toBe('Il y a 2 pommes');
            });
            it('should ignore a plural translation when requesting the singular form', function () {
                i18n = new I18N({ locale: 'fr' });
                i18n.setMessages('messages', 'fr', {
                    'apple': [
                        'pomme',
                        'pommes'
                    ]
                }, 'nplurals=2; plural=n>1;');
                expect(i18n.gettext('apple')).toBe('apple');
                expect(i18n.ngettext('apple', 'apples', 1, 1)).toBe('pomme');
                expect(i18n.ngettext('apple', 'apples', 2, 2)).toBe('pommes');
            });
            it('should ignore a singular translation when requesting the plural form', function () {
                i18n = new I18N({ locale: 'fr' });
                i18n.setMessages('messages', 'fr', {
                    'apple': 'pomme'
                });
                expect(i18n.gettext('apple')).toBe('pomme');
                expect(i18n.ngettext('apple', 'apples', 1, 1)).toBe('apple');
                expect(i18n.ngettext('apple', 'apples', 2, 2)).toBe('apples');
            });
            it('should fail unvalid plural form', function () {
                i18n = new I18N({ locale: 'foo' });
                i18n.setMessages('messages', 'foo', {
                    'There is %1 apple': [
                        'Il y a %1 pomme',
                        'Il y a %1 pommes'
                    ]
                }, 'nplurals=2; plural=[not valid];');

                try {
                    i18n.ngettext('There is %1 apple', 'There are %1 apples', 42);
                } catch (e) {
                    expect(e.message).toBe('The plural form "nplurals=2; plural=[not valid];" is not valid');
                }
            });
            it('should fail another unvalid plural form', function () {
                i18n = new I18N({ locale: 'foo' });
                i18n.setMessages('messages', 'foo', {
                    'There is %1 apple': [
                        'Il y a %1 pomme',
                        'Il y a %1 pommes'
                    ]
                }, 'nplurals=2; plural=n>1; console.log(`PWNED!`);');

                // do not throw error on default plural form if key does not have a translation
                expect(i18n.ngettext('foo', 'bar', 2)).toBe('bar');

                try {
                    i18n.ngettext('There is %1 apple', 'There are %1 apples', 42);
                } catch (e) {
                    expect(e.message).toBe('The plural form "nplurals=2; plural=n>1; console.log(`PWNED!`);" is not valid');
                }
            });
            it('should handle multiple locale & pluals cohabitation', function () {
                i18n = new I18N({ locale: 'foo' });
                i18n.setMessages('messages', 'foo', {
                    'singular': [
                        'singular',
                        'plural'
                    ]
                }, (n: number) => ({ nplurals: 2, plural: n > 10 ? 1 : 0 }));
                i18n.setMessages('messages', 'bar', {
                    'singular': [
                        'singulier',
                        'pluriel'
                    ]
                }, (n: number) => ({ nplurals: 2, plural: n > 100 ? 1 : 0 }));
                expect(i18n.ngettext('singular', 'plural', 9)).toBe('singular');
                expect(i18n.ngettext('singular', 'plural', 11)).toBe('plural');

                i18n.setLocale('bar');
                expect(i18n.ngettext('singular', 'plural', 9)).toBe('singulier');
                expect(i18n.ngettext('singular', 'plural', 11)).toBe('singulier');
                expect(i18n.ngettext('singular', 'plural', 111)).toBe('pluriel');
            });
            it('should fallback to singular form if there is a problem with plurals', function () {
                // incorrect plural, more than nplurals
                i18n = new I18N({ locale: 'foo' });
                i18n.setMessages('messages', 'foo', {
                    'apple': [
                        'pomme',
                        'pommes'
                    ]
                }, 'nplurals=2; plural=3;');
                expect(i18n.ngettext('apple', 'apples', 1, 1)).toBe('pomme');

                // plural is correct, but according to nplurals there should be more translations
                i18n = new I18N({ locale: 'ru' });
                i18n.setMessages('messages', 'ru', {
                    '%1 apple': [
                        '%1 яблоко',
                        '%1 яблока'
                        // '%1 яблок' - missed translation
                    ]
                }, (n: number) => {
                    let plural: any = n % 10 == 1 && n % 100 != 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
                    return { nplurals: 3, plural: (plural === true ? 1 : (plural ? plural : 0)) };
                });
                expect(i18n.ngettext('%1 apple', '%1 apples', 5, 5)).toBe('5 яблоко');
            });
            it('should correctly handle substitution when an array of one message is provided in an nplurals=1 locale', function () {
                i18n = new I18N({ locale: 'tdt' });
                i18n.setMessages('messages', 'tdt', {
                    '%1 lesson left in %2.':
                        [
                            '%1 lisaun iha %2'
                        ],
                    '%1 lesson left.': [
                        '%1 lisaun iha.'
                    ]
                }, 'nplurals=1; plural=0;');
                expect(i18n.ngettext('%1 lesson left.', '%1 lessons left.', 1, 1)).toBe('1 lisaun iha.');
                expect(i18n.ngettext('%1 lesson left.', '%1 lessons left.', 5, 5)).toBe('5 lisaun iha.');
                expect(i18n.ngettext('%1 lesson left in %2.', '%1 lessons left in %2.', 1, 1, 'Mathematics')).toBe('1 lisaun iha Mathematics');
                expect(i18n.ngettext('%1 lesson left in %2.', '%1 lessons left in %2.', 5, 5, 'Mathematics')).toBe('5 lisaun iha Mathematics');
            });
            it('should handle plural form and strfmt subsitutions without messing with indexes', function () {
                i18n = new I18N();
                var string = i18n.ngettext(
                    '%1 (%2 charge)',
                    '%1 (%2 charges)',
                    3,
                    'defibrillator',
                    3
                );
                expect(string).toBe('defibrillator (3 charges)');
            });
        });
    });
});
