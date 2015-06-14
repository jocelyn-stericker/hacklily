/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* tslint:disable */
var DOMProperty = require("react/lib/DOMProperty");
/* tslint:enable */

export function inject() {
    let custAttributes = {
        "alignment-baseline": true,
        "text-decoration": true,
        "letter-spacing": true,
        "font-style": true,
        "font-weight": true,
        "color": true,
        "direction": true
    };

    DOMProperty.injection.injectDOMPropertyConfig({
        isCustomAttribute: function (attributeName: string) {
            return attributeName in custAttributes;
        }
    });
}
