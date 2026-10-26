// @ts-nocheck
import {Children,isValidElement,useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

function optionsFrom(children,group=''){
 return Children.toArray(children).flatMap(child=>{
  if(!isValidElement(child))return [];
  if(child.type==='optgroup')return optionsFrom(child.props.children,child.props.label);
  return [{value:String(child.props.value??child.props.children),label:String(child.props.children),disabled:!!child.props.disabled,group}];
 });
}

export default function Select({value,onChange,children,disabled,className='',...props}){
 const options=useMemo(()=>optionsFrom(children),[children]);
 const selected=Math.max(0,options.findIndex(o=>o.value===String(value)));
 const [open,setOpen]=useState(false),[active,setActive]=useState(selected),[position,setPosition]=useState({left:0,top:0,width:200,maxHeight:300});
 const trigger=useRef(null),menu=useRef(null),typed=useRef({text:'',time:0}),id=useId().replace(/:/g,'');
 const name=props['aria-label']||'选择选项';
 function place(){const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(window.innerWidth-24,Math.max(rect.width,208));const below=window.innerHeight-rect.bottom-12,above=rect.top-12;const maxHeight=Math.max(120,Math.min(340,Math.max(below,above)));const height=Math.min(options.length*40+16,maxHeight);setPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top:below>=height?rect.bottom+6:Math.max(8,rect.top-height-6),width,maxHeight});}
 function toggle(){if(disabled)return;if(!open){setActive(selected);place();}setOpen(!open);}
 function choose(index){const option=options[index];if(!option||option.disabled)return;onChange?.({target:{value:option.value},currentTarget:{value:option.value}});setOpen(false);trigger.current?.focus({preventScroll:true});}
 useEffect(()=>{if(!open)return;const outside=e=>{if(!trigger.current?.contains(e.target)&&!menu.current?.contains(e.target))setOpen(false);};const move=e=>{if(!menu.current?.contains(e.target))place();};document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',move,true);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',move,true);};},[open,options.length]);
 useEffect(()=>{if(open)menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[active,open]);
 function keyDown(e){
  if(e.key==='Escape'){setOpen(false);e.stopPropagation();return;}
  if(e.key==='Tab'){setOpen(false);return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!open){place();setOpen(true);setActive(selected);return;}let next=e.key==='Home'?0:e.key==='End'?options.length-1:(active+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;for(let i=0;i<options.length&&options[next]?.disabled;i++)next=(next+1)%options.length;setActive(next);return;}
  if(e.key==='Enter'||e.key===' '){e.preventDefault();if(open)choose(active);else toggle();return;}
  if(e.key.length===1){const now=Date.now();typed.current={text:(now-typed.current.time<600?typed.current.text:'')+e.key.toLowerCase(),time:now};const index=options.findIndex(o=>!o.disabled&&o.label.toLowerCase().startsWith(typed.current.text));if(index>=0){e.preventDefault();if(!open){place();setOpen(true);}setActive(index);}}
 }
 return <><button {...props} ref={trigger} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} disabled={disabled} className={`app-select-trigger ${className}`} data-state={open?'open':'closed'} onClick={toggle} onKeyDown={keyDown}><span>{options[selected]?.label||'请选择'}</span><span className="select-chevron" aria-hidden="true"/></button>
  {open&&createPortal(<div ref={menu} id={id} role="listbox" aria-label={name} className="app-select-menu" style={position}>{options.map((option,i)=><div key={option.value}>{option.group&&option.group!==options[i-1]?.group&&<div className="select-group">{option.group}</div>}<div id={`${id}-${i}`} data-index={i} role="option" aria-selected={String(value)===option.value} aria-disabled={option.disabled||undefined} className={`app-select-option${active===i?' is-active':''}`} onPointerMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}><span>{option.label}</span>{String(value)===option.value&&<span aria-hidden="true">✓</span>}</div></div>)}</div>,document.body)}
 </>;
}
