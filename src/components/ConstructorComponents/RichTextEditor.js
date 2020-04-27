import * as St from './../styles/ConstructorStyles/RichTextEditorStyle.module.css';
import React, {useMemo} from "react";
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, CompositeDecorator, DefaultDraftBlockRenderMap} from 'draft-js';
import * as Immutable from 'immutable'
import {inlineStyleMap} from "../styles/ConstructorStyles/DraftStyles/INLINE_DRAFT_STYLES_JS";
import DropMenuMaterialUi from "../CommonComps/DropMenuMaterialUi";
import {DraftMainContext} from "../CommonComps/Contexts";
import * as REGEXP_SUFS from './../styles/ConstructorStyles/DraftStyles/RegexpForStyleSuffiks'

export class RichTextEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editorState: EditorState.createEmpty(new CompositeDecorator([
                {
                    strategy: findLinkEntities,
                    component: (props) => <Link {...props} editorState={this.state.editorState}
                                                /*toggleEditorReadOnly={this.toggleEditorReadOnly}*//>,
                },
            ])),
            showURLInput: false,
            urlValue: '',
          /*  EditorReadOnly: false,*/
        };


        this.handleKeyCommand = this._handleKeyCommand.bind(this);
        this.mapKeyToEditorCommand = this._mapKeyToEditorCommand.bind(this);
        this.toggleBlockType = this._toggleBlockType.bind(this);
        this.toggleInlineStyle = this._toggleInlineStyle.bind(this);


        this.onChange = editorState => this.setState({editorState});
        this.handleKeyCommand = this.handleKeyCommand.bind(this);
        //////////////////////


        this.promptForLink = this._promptForLink.bind(this);
        this.onURLChange = (e) => this.setState({urlValue: e.target.value});
        this.confirmLink = this._confirmLink.bind(this);
        this.onLinkInputKeyDown = this._onLinkInputKeyDown.bind(this);
        this.removeLink = this._removeLink.bind(this);
        this.blockRendererFn = this.blockRendererFn.bind(this);
        this.blockRendererFn = this.blockRendererFn.bind(this);
        this.saveSelectionStateActionWrapper=this._saveSelectionStateActionWrapper.bind(this);

        /*
                this.toggleEditorReadOnly = this.toggleEditorReadOnly.bind(this);
        */


    this.selectionbefore=undefined;
    this.contextvalue={
        saveSelectionStateActionWrapper: this.saveSelectionStateActionWrapper,
       }
//////////////////////////////
    }

    _saveSelectionStateActionWrapper(wrapFunc) {
        return (e,...params) => {
            if (e) {
                e.preventDefault();
            }
            let {editorState} = this.state;
            this.selectionbefore = editorState.getSelection();
            if(wrapFunc){
                wrapFunc(e);
            }
            if(params.length>0){
                wrapFunc(...params);
            }
            setTimeout(() => this.onChange(EditorState.forceSelection(this.state.editorState, this.selectionbefore)), 0);
        }
    };
    //////////////////////////////
    _promptForLink(e) {
        e.preventDefault();
        const {editorState} = this.state;
        const selection = editorState.getSelection();
        if (!selection.isCollapsed()) {
            const contentState = editorState.getCurrentContent();
            const startKey = editorState.getSelection().getStartKey();
            const startOffset = editorState.getSelection().getStartOffset();
            const blockWithLinkAtBeginning = contentState.getBlockForKey(startKey);
            const linkKey = blockWithLinkAtBeginning.getEntityAt(startOffset);

            let url = '';
            if (linkKey) {
                const linkInstance = contentState.getEntity(linkKey);
                url = linkInstance.getData().url;
            }

            this.setState({
                showURLInput: true,
                urlValue: url,
            }/*, () => {
                setTimeout(() => this.refs.url.focus(), 0);
            }*/);
        }
    }

    _confirmLink(e) {
        e.preventDefault();
        const {editorState, urlValue} = this.state;
        const contentState = editorState.getCurrentContent();
        const contentStateWithEntity = contentState.createEntity(
            'LINK',
            'MUTABLE',
            {url: urlValue}
        );
        const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
        const newEditorState = EditorState.set(editorState, {currentContent: contentStateWithEntity});
        this.setState({
            editorState: RichUtils.toggleLink(
                newEditorState,
                newEditorState.getSelection(),
                entityKey
            ),
            showURLInput: false,
            urlValue: '',
        }/*, () => {
            setTimeout(() => this.refs.editor.focus(), 0);
        }*/);
    }

    _onLinkInputKeyDown(e) {
        if (e.which === 13) {
            this._confirmLink(e);
        }
    }

    _removeLink(e) {
        e.preventDefault();
        const {editorState} = this.state;
        const selection = editorState.getSelection();
        if (!selection.isCollapsed()) {
            this.setState({
                editorState: RichUtils.toggleLink(editorState, selection, null),
            });
        }
    }

    /////////////////////////
    _handleKeyCommand(command, editorState) {
        const newState = RichUtils.handleKeyCommand(editorState, command);
        if (newState) {
            this.onChange(newState);
            return 'handled';//или тру фолс?
        }
        return 'not-handled';
    }

    _mapKeyToEditorCommand(e) {
        if (e.keyCode === 9 /* TAB */) {
            const newEditorState = RichUtils.onTab(
                e,
                this.state.editorState,
                4, /* maxDepth */
            );
            if (newEditorState !== this.state.editorState) {
                this.onChange(newEditorState);
            }
            return;
        }

        if (e.keyCode === 8 /* backspace */) {
            const newEditorState = RichUtils.onBackspace(
                this.state.editorState,
            );
            if (newEditorState !== this.state.editorState) {
               // this.onChange(newEditorState);
            }
            return;
        }


        return getDefaultKeyBinding(e);
    }

    _toggleBlockType(blockType) {
        this.onChange(
            RichUtils.toggleBlockType(
                this.state.editorState,
                blockType
            )
        );
    }

    _toggleInlineStyle(inlineStyle, styleSuffiksToReplace) { //styleSuffiksToReplace -суффикс стиля, если есть то должен заменить стиль с тем же суффиксом, например, для шрифтов, заменить старый, а не тыкнуть поверх
       if (styleSuffiksToReplace){
           const currentStyle = this.state.editorState.getCurrentInlineStyle();//вообще говоря возвращает набор стилей для самого левого края выделения
           const DuplicateStyle=Array.from(currentStyle.values()).find(
               (value => {
                   let regexp = new RegExp(REGEXP_SUFS.REGEXP_FONT_FAMILY_SUFFIKS);
                   if (regexp.test(value))
                       return true;
               }));
           this.toggleInlineStyle(DuplicateStyle);
       }
       setTimeout(()=>{  this.onChange(
           RichUtils.toggleInlineStyle(
               this.state.editorState,
               inlineStyle
           )
       );
       }, 0)
    }


     blockRendererFn(contentBlock) {

        const type = contentBlock.getType();
        if (type === 'exampleblocktype') {
            return {
                component: Examplewrappercomp,          //внутрь вставляется этот элемент, заменяя все внутри, сам элемент внешний принимает параметр эдитэбл
                editable: true,
                props: {
                    foo: 'bar',
                    children: contentBlock.getText()
                },
            };
        }
    }
   /* toggleEditorReadOnly(readonly) {
        setTimeout(() => this.setState({EditorReadOnly: readonly}), 0)
    }*/

    render() {

        const {editorState} = this.state;
        ///////////////
        let urlInput;
        if (this.state.showURLInput) {
            urlInput =
                <div style={styles.urlInputContainer}>
                    <input
                        onChange={this.onURLChange}
                        ref="url"
                        style={styles.urlInput}
                        type="text"
                        value={this.state.urlValue}
                        onKeyDown={this.onLinkInputKeyDown}
                    />
                    <button onMouseDown={this.confirmLink}>
                        Confirm
                    </button>
                </div>;
        }

        ////////////////аккуратно, может сломать всю мемоизацию
        return (
            <DraftMainContext.Provider value={this.contextvalue}>
            <div className={`${St.EditorContainer}`}>
                <BlockStyleControls
                    editorState={editorState}
                    onToggle={this.toggleBlockType}
                />
                <InlineStyleControls
                    editorState={editorState}
                    onToggle={this.toggleInlineStyle}
                    promptForLink={this.promptForLink}
                    removeLink={this.removeLink}
                />
                {urlInput}
                <div className={`${St.RichEditoreditor}`} onClick={this.focus}>
                    <Editor
                        blockStyleFn={blockStyleFn}
                        customStyleMap={inlineStyleMap}
                        editorState={editorState}
                        handleKeyCommand={this.handleKeyCommand}
                        keyBindingFn={this.mapKeyToEditorCommand}
                        onChange={this.onChange}
                        spellCheck={true}
                        readOnly={this.state.EditorReadOnly}
                        blockRendererFn={this.blockRendererFn}
                        /*blockRenderMap={
                            DefaultDraftBlockRenderMap.merge(
                                Immutable.Map({
                                    'exampleblocktype': { //atomic чтобы onbackspace удалял все сразу , надо иметь такой тип атомик всегда и на основе допустим энтити внутри рисовать все
                                        element: 'H1',  //ВМЕСТО БЛОКА  С ТИПО ЭКЗАМПЛ ТАЙП КАКИМ БЫ ОН НЕ БЫЛ ТЭГОМ ХТМЛ РИСУЕТ ЭЛЕМЕНТ, СОХРАНЯЯ ВНУТРЕННОСТИ, ПОВЕРХ МОЖНО СВОЙ РАКТ ЭЛЕМЕНТ ВОКРУГ ЕЩЕ
                                        wrapper: <Examplewrappercomp/>
                                    },
                                })
                            )}*/
                    />
                </div>
            </div>
            </DraftMainContext.Provider>
        );
    }
}

/*const styleMap = {
    CODE: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
        fontSize: 16,
        padding: 2,
    },
    TestColor: {
        color: '#FF4422'
    }
};*/

function blockStyleFn(block) {
    switch (block.getType()) {
        case 'blockquote':
            return `${St.RichEditorblockquote}`;
        default:
            return null;
    }
}

class StyleButton extends React.Component {
    constructor(props) {
        super(props);
        this.onToggle = (e) => {
            e.preventDefault();
            this.props.onToggle(this.props.type);
        };
    }

    render() {
        let className = `${St.RichEditorstyleButton}`;
        if (this.props.active) {
            className += `  ${St.RichEditoractiveButton}`;
        }

        return (
            <span className={className} onMouseDown={this.onToggle}>
              {this.props.label}
            </span>
        );
    }
}




let Examplewrappercomp=(props)=>{

    return(
        <div style={{backgroundColor: "rgba(255,0,2,0.48)", height:'10vmin', width:'10vmax', display:'inline-block'}}  contentEditable="false">
            {props.children}
        </div>
    )
};

const BLOCK_TYPES = [
    {label: 'H1', blocktype: 'header-one'},
    {label: 'H2', blocktype: 'header-two'},
    {label: 'H3', blocktype: 'header-three'},
    {label: 'H4', blocktype: 'header-four'},
    {label: 'H5', blocktype: 'header-five'},
    {label: 'H6', blocktype: 'header-six'},
    {label: 'Blockquote', blocktype: 'blockquote'},
    {label: 'UL', blocktype: 'unordered-list-item'},
    {label: 'OL', blocktype: 'ordered-list-item'},
    {label: 'Code Block', blocktype: 'code-block'},
    {label: 'ExampleBlock', blocktype: 'exampleblocktype'},

];

const BlockStyleControls = (props) => {
    const {editorState} = props;
    const selection = editorState.getSelection();
    const blockType = editorState
        .getCurrentContent()
        .getBlockForKey(selection.getStartKey())
        .getType();

    return (
        <div className={`${St.RichEditorcontrols}`}>
            {BLOCK_TYPES.map((type) =>
                <StyleButton
                    key={type.label}
                    active={type.blocktype === blockType}
                    label={type.label}
                    onToggle={props.onToggle}
                    type={type.blocktype}
                />
            )}
        </div>
    );
};

var INLINE_STYLES = [
    {label: 'Bold', style: 'BOLD'},
    {label: 'Italic', style: 'ITALIC'},
    {label: 'Underline', style: 'UNDERLINE'},
    {label: 'Monospace', style: 'ANTQ_FONT_FAMILY'},
    {label: 'TestColor', style: 'TestColor'},
];

const InlineStyleControls = React.memo((props) => {

    const currentStyle = props.editorState.getCurrentInlineStyle();//вообще говоря возвращает набор стилей для самого левого края выделения
    return (
        <div className={`${St.RichEditorcontrols}`}>

           < DropMenuMaterialUi onToggle={props.onToggle}
                                currentStyle={currentStyle}
           />

            {INLINE_STYLES.map((type) =>
                <StyleButton
                    key={type.label}
                    active={currentStyle.has(type.style)}
                    label={type.label}
                    onToggle={props.onToggle}
                    type={type.style}
                />
            )}
            <button
                onMouseDown={props.promptForLink}
                style={{marginRight: 10}}>
                Add Link
            </button>
            <button onMouseDown={props.removeLink}>
                Remove Link
            </button>
        </div>
    );
});

/////////////
function findLinkEntities(contentBlock, callback, contentState) {
    contentBlock.findEntityRanges(
        (character) => {
            const entityKey = character.getEntity();
            return (
                entityKey !== null &&
                contentState.getEntity(entityKey).getType() === 'LINK'
            );
        },
        callback
    );
}


const Link = (props) => {
    const {url} = props.contentState.getEntity(props.entityKey).getData();
    return (

        <a href={url} style={styles.link}
/*
           contentEditable="false"
*/


                                                                  /*  onBeforeInput={()=>alert('input')}*/
                                                                  /*  onChange={()=>alert('change')}*/

        /*     onBeforeInputCapture={()=>alert('inputcaptur')}*/
          /* onMouseEnter={() => props.toggleEditorReadOnly(true)}
           onMouseLeave={() => props.toggleEditorReadOnly(false)}*/>
            <span  onFocus={()=>alert('focus')}
                   onSelect={()=>alert('focus')}
                   onInput={()=>alert('focus')}
                   onBeforeInput={()=>alert('focus')}
                   onKeyDown={()=>alert('focus')}


                /*  contentEditable="false" */
                style={{ display:'inline'}}>
            {props.children}
            </span>
        </a>

    );
};

////////////
const styles = {
    root: {
        fontFamily: '\'Georgia\', serif',
        padding: 20,
        width: 600,
    },
    buttons: {
        marginBottom: 10,
    },
    urlInputContainer: {
        marginBottom: 10,
    },
    urlInput: {
        fontFamily: '\'Georgia\', serif',
        marginRight: 10,
        padding: 3,
    },
    editor: {
        border: '1px solid #ccc',
        cursor: 'text',
        minHeight: 80,
        padding: 10,
    },
    button: {
        marginTop: 10,
        textAlign: 'center',
    },
    link: {
        color: '#3b5998',
        textDecoration: 'underline',
        height:"7vmin",
        display: 'inline',
        lineHeight:'50px',
        fontSize: '10px',
        backgroundColor: "#984b69",
        borderColor: "#343A40",
       /* padding:"1vmin",
        margin:"1vmin",*/
        position:"relative",
borderWidth: "0.3vmin",
borderStyle: "solid",
borderRadius: "2vmin",
    },
};