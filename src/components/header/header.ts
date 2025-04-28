// eslint-disable-next-line import/no-extraneous-dependencies
import { LitElement, html, css } from "lit";

export class HeaderComponent extends LitElement {
  static styles = css`
    header {
      background-color: #0078d4;
      color: white;
      padding: 1rem;
      text-align: center;
      font-size: 1.5rem;
    }
  `;

  render() {
    return html` <header>BIM Viewer Application</header> `;
  }
}

customElements.define("header-component", HeaderComponent);
