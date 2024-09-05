type Messages = {
    [key: string]: string | string[];
};

type Dictionary = {
    [domain: string]: {
        [locale: string]: Messages;
    };
};

type Plural = {
    nplurals: number;
    plural: number;
};

type PluralFunction = (n: number) => Plural;
type PluralFunctions = Record<string, PluralFunction>;

type GettextOptions = {
    locale?: string;
    domain?: string;
    ctxt_delimiter?: string;
    messages?: Messages;
    plural_forms?: any;
    plural_form?: boolean;
    plural_func?: PluralFunction;
};

type Defaults = {
    domain: string;
    locale: string;
    plural_func: PluralFunction;
    ctxt_delimiter: string;
};

const CATEGORY_INDEX = {
    zero: 0,
    one: 0,
    two: 1,
    few: 1,
    many: 2,
    other: 1
};

function safeParseInt(value: string) {
    const parsed = parseInt(value, 10);
    return String(parsed) === value ? parsed : null;
}

export class I18N {
    __version__ = '1.0.0';

    locale: string;
    domain: string;
    ctxt_delimiter: string;

    plural_forms = {};
    plural_funcs: PluralFunctions = {};
    dictionary: Dictionary = {};

    defaults: Defaults = {
        domain: 'messages',
        locale: (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : false) || 'en',
        plural_func: (n: number) => { return { nplurals: 2, plural: (n != 1) ? 1 : 0 }; },
        ctxt_delimiter: String.fromCharCode(4) // \u0004
    };

    constructor(options?: GettextOptions) {
        this.locale = options?.locale ?? this.defaults.locale;
        this.domain = options?.domain ?? this.defaults.domain;
        this.ctxt_delimiter = options?.ctxt_delimiter ?? this.defaults.ctxt_delimiter;

        if (options?.messages) {
            this.dictionary[this.domain] = {};
            this.dictionary[this.domain][this.locale] = options.messages;
        }

        if (options?.plural_forms) {
            this.plural_forms[this.locale] = options.plural_forms;
        }
    }

    // sprintf equivalent, takes a string and some arguments to make a computed string
    // eg: strfmt("%1 dogs are in %2", 7, "the kitchen"); => "7 dogs are in the kitchen"
    // eg: strfmt("I like %1, bananas and %1", "apples"); => "I like apples, bananas and apples"
    // NB: removes msg context if there is one present
    strfmt(fmt: string, ...args: any[]) {
        return fmt
            // put space after double % to prevent placeholder replacement of such matches
            .replace(/%%/g, '%% ')
            // replace placeholders
            .replace(/%(\d+)/g, function (_str, p1) {
                const index = parseInt(p1) - 1;
                return args[index];
            })
            // replace double % and space with single %
            .replace(/%% /g, '%');
    }

    removeContext(str: string) {
        // if there is context, remove it
        if (str.indexOf(this.ctxt_delimiter) !== -1) {
            const parts = str.split(this.ctxt_delimiter);
            return parts[1];
        }

        return str;
    }

    expand_locale(locale: string) {
        const locales = [locale];
        let i = locale.lastIndexOf('-');
        while (i > 0) {
            locale = locale.slice(0, i);
            locales.push(locale);
            i = locale.lastIndexOf('-');
        }
        return locales;
    }

    normalizeLocale(locale: string) {
        // Convert locale to BCP 47. If the locale is in POSIX format, locale variant and encoding is discarded.
        locale = locale.replace('_', '-');
        const i = locale.search(/[.@]/);
        if (i != -1) locale = locale.slice(0, i);
        return locale;
    }

    getPluralFunc(plural_form: string): PluralFunction {
        // Plural form string regexp
        // taken from https://github.com/Orange-OpenSource/gettext.js/blob/master/lib.gettext.js
        // plural forms list available here http://localization-guide.readthedocs.org/en/latest/l10n/pluralforms.html
        const pf_re = new RegExp('^\\s*nplurals\\s*=\\s*[0-9]+\\s*;\\s*plural\\s*=\\s*(?:\\s|[-\\?\\|&=!<>+*/%:;n0-9_\(\)])+');

        const match = plural_form.match(pf_re);

        if (!match || match[0] !== plural_form)
            throw new Error(this.strfmt('The plural form "%1" is not valid', plural_form));

        const parts = plural_form.split(';').map(part => part.trim());

        let nplurals: number | null = null;
        let plural: number | null = null;

        parts.forEach(part => {
            if (part.startsWith('nplurals=')) {
                nplurals = safeParseInt(part.replace('nplurals=', '').trim());
            } else if (part.startsWith('plural=')) {
                plural = safeParseInt(part.replace('plural=', '').trim());
            }
        });

        if (nplurals === null || plural === null) {
            throw new Error(`Unsupported plural form ${plural_form}`);
        }

        return (_: number) => {
            return { nplurals, plural };
        };
    }

    getPlural(n: number) {
        const rules = new Intl.PluralRules(this.locale);
        const nplurals = rules.resolvedOptions().pluralCategories.length;
        const plural = CATEGORY_INDEX[rules.select(n)] ?? 0;
        return { nplurals, plural };
    }

    t(messages: string[], n: number, options: GettextOptions, ...args: any[]) {
        // Singular is very easy, just pass dictionnary message through strfmt
        if (!options.plural_form) {
            return this.strfmt(this.removeContext(messages[0]), ...args);
        }

        let plural: Plural;

        // if a plural func is given, use that one
        if (options.plural_func) {
            plural = options.plural_func(n);
        } else if (this.plural_funcs[this.locale]) {
            plural = this.plural_funcs[this.locale](n);
        } else {
            plural = this.getPlural(n);
        }

        // If there is a problem with plurals, fallback to singular one
        if (plural?.plural === undefined || plural.plural > plural.nplurals || messages.length <= plural.plural) {
            plural.plural = 0;
        }

        return this.strfmt(this.removeContext(messages[plural.plural]), ...args);
    }

    __ = this.gettext;
    _n = this.ngettext;
    _p = this.pgettext;

    setMessages(domain: string, locale: string, messages: Messages, plural_form_or_function?: string | PluralFunction) {
        if (!domain || !locale || !messages)
            throw new Error('You must provide a domain, a locale and messages');

        locale = this.normalizeLocale(locale);

        if (plural_form_or_function) {
            if (typeof plural_form_or_function === 'string') {
                try {
                    this.plural_funcs[locale] = this.getPluralFunc(plural_form_or_function);
                } catch (_) { }
            } else {
                this.plural_funcs[locale] = plural_form_or_function;
            }
        }

        if (!this.dictionary[domain])
            this.dictionary[domain] = {};

        this.dictionary[domain][locale] = messages;

        return this;
    }

    loadJSON(jsonData: any, domain: string) {
        if (!jsonData[''] || !jsonData['']['language'] || !jsonData['']['plural-forms'])
            throw new Error('Wrong JSON, it must have an empty key ("") with "language" and "plural-forms" information');

        const headers = jsonData[''];
        delete jsonData[''];

        return this.setMessages(domain || this.defaults.domain, headers['language'], jsonData, headers['plural-forms']);
    }

    setLocale(locale: string) {
        this.locale = this.normalizeLocale(locale);
        return this;
    }

    getLocale() {
        return this.locale;
    }

    textdomain(domain: string) {
        if (!domain) {
            return this.domain;
        }
        this.domain = domain;
        return this;
    }

    gettext(msgid: string, ...args: any[]) {
        return this.dcnpgettext(undefined, undefined, msgid, undefined, undefined, ...args);
    }

    ngettext(msgid: string, msgid_plural: string, n: number, ...args: any[]) {
        return this.dcnpgettext(undefined, undefined, msgid, msgid_plural, n, ...args);
    }

    pgettext(msgctxt: string, msgid: string, ...args: any[]) {
        return this.dcnpgettext(undefined, msgctxt, msgid, undefined, undefined, ...args);
    }

    dcnpgettext(domain: string, msgctxt: string, msgid: string, msgid_plural: string, n: number, ...args: any[]) {
        domain = domain || this.domain;

        const options: GettextOptions = { plural_form: false };
        const key = msgctxt ? `${msgctxt}${this.ctxt_delimiter}${msgid}` : msgid;
        let exist: string | string[] | undefined;

        for (const locale of this.expand_locale(this.locale)) {
            exist = this.dictionary[domain]?.[locale]?.[key];

            // because it's not possible to define both a singular and a plural form of the same msgid,
            // we need to check that the stored form is the same as the expected one.
            // if not, we'll just ignore the translation and consider it as not translated.
            if (msgid_plural) {
                if (!Array.isArray(exist)) {
                    exist = undefined;
                }
            } else {
                if (Array.isArray(exist)) {
                    exist = undefined;
                }
            }

            if (exist) {
                break;
            }
        }

        let translation: string | string[];

        if (!exist) {
            translation = msgid;
            options.plural_func = this.defaults.plural_func;
        } else {
            translation = exist;
        }

        // Singular form
        if (!msgid_plural) {
            if (Array.isArray(translation)) {
                throw new Error('Invalid translation type, found array, expected string');
            }
            return this.t([translation], n, options, ...args);
        }

        // Plural one
        options.plural_form = true;
        return this.t(exist ? translation as string[] : [msgid, msgid_plural], n, options, ...args);
    }
}
