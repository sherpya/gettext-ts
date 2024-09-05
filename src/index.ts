import { I18N } from './gettext';

let i18n = new I18N({
});

console.log(i18n.getPluralFunc('nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);').toString());
