/* global tinymce, editorIdentifier, window */
import i18n from 'i18n';
import TinyMCEActionRegistrar from 'lib/TinyMCEActionRegistrar';
import React from 'react';
import { createRoot } from 'react-dom/client';
import jQuery from 'jquery';
import { createInsertLinkModal } from 'containers/InsertLinkModal/InsertLinkModal';
import { loadComponent } from 'lib/Injector';

const commandName = 'sslinkemail';

// Link to email address
TinyMCEActionRegistrar.addAction(
  'sslink',
  {
    text: i18n._t('Admin.LINKLABEL_EMAIL', 'Link to email address'),
    onclick: (editorInst) => editorInst.execCommand(commandName),
    priority: 51,
  },
  editorIdentifier,
).addCommandWithUrlTest(commandName, /^mailto:/);

const plugin = {
  init(editor) {
    editor.addCommand(commandName, () => {
      const field = window.jQuery(`#${editor.id}`).entwine('ss');

      field.openLinkEmailDialog();
    });
  },
};

const modalId = 'insert-link__dialog-wrapper--email';
const sectionConfigKey = 'SilverStripe\\Admin\\LeftAndMain';
const formName = 'EditorEmailLink';
const InsertLinkEmailModal = loadComponent(createInsertLinkModal(sectionConfigKey, formName));

jQuery.entwine('ss', ($) => {
  $('textarea.htmleditor').entwine({
    openLinkEmailDialog() {
      let dialog = $(`#${modalId}`);

      if (!dialog.length) {
        dialog = $(`<div id="${modalId}" />`);
        $('body').append(dialog);
      }
      dialog.addClass('insert-link__dialog-wrapper');

      dialog.setElement(this);
      dialog.open();
    },
  });

  /**
   * Assumes that $('.insert-link__dialog-wrapper').entwine({}); is defined for shared functions
   */
  $(`#${modalId}`).entwine({
    ReactRoot: null,

    renderModal(isOpen) {
      const handleHide = () => this.close();
      const handleInsert = (...args) => this.handleInsert(...args);
      const attrs = this.getOriginalAttributes();
      const requireLinkText = this.getRequireLinkText();

      // create/update the react component
      let root = this.getReactRoot();
      if (!root) {
        root = createRoot(this[0]);
        this.setReactRoot(root);
      }
      root.render(
        <InsertLinkEmailModal
          isOpen={isOpen}
          onInsert={handleInsert}
          onClosed={handleHide}
          title={i18n._t('Admin.LINK_EMAIL', 'Insert email link')}
          bodyClassName="modal__dialog"
          className="insert-link__dialog-wrapper--email"
          fileAttributes={attrs}
          identifier="Admin.InsertLinkEmailModal"
          requireLinkText={requireLinkText}
        />
      );
    },

    getOriginalAttributes() {
      const editor = this.getElement().getEditor();
      const node = $(editor.getSelectedNode());

      const hrefParts = (node.attr('href') || '').split('?');

      let email = hrefParts[0].replace(/^mailto:/, '').split('?')[0];
      // simple valid regex check a@b.c passes
      if (!email.match(/.+@.+\..+/)) {
        email = '';
      }

      const subjectMatch = (hrefParts[1])
        ? hrefParts[1].match(/subject=([^&]+)/)
        : '';
      const subject = (subjectMatch)
        ? decodeURIComponent(subjectMatch[1])
        : '';

      return {
        Link: email,
        Subject: subject,
        Description: node.attr('title'),
      };
    },

    buildAttributes(data) {
      const attributes = this._super(data);

      let href = '';

      let email = attributes.href.replace(/^mailto:/, '').split('?')[0];
      // simple valid regex check a@b.c passes
      if (!email.match(/.+@.+\..+/)) {
        email = '';
      }

      // Prefix the URL with "http://" if no prefix is found
      if (email) {
        href = `mailto:${email}`;
      }
      if (href && data.Subject) {
        href = `${href}?subject=${encodeURIComponent(data.Subject)}`;
      }
      attributes.href = href;

      delete attributes.target;

      return attributes;
    },
  });
});

// Adds the plugin class to the list of available TinyMCE plugins
tinymce.PluginManager.add(commandName, (editor) => plugin.init(editor));
export default plugin;
