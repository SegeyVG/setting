import React from 'react';
import $ from 'jquery';
import { LOAD } from '../common/load';
import nextId from "react-id-generator";


//import { knotify } from "../common/notify";

const MAIN_LV = 0;   //форма загружена
const SAVE_LV = 4;      //запрос на сохранение настроек отправлен
const MODESAVE = 1;            // флажок, говорит о том, что была нажата кнопка Сохранить

export class SettingFS extends React.Component {
    constructor(props) {
        super(props);
        let set = {};
        set.server = (this.props.setting===undefined) ? "" : this.props.setting.db.server;
        set.port = (this.props.setting===undefined) ? "1433" : this.props.setting.db.port;
        set.dbname = (this.props.setting===undefined) ? "" : this.props.setting.db.dbname;
        set.user = (this.props.setting===undefined) ? "" : this.props.setting.db.user;
        set.pass = (this.props.setting===undefined) ? "" : this.props.setting.db.pass;
        set.ini = (this.props.setting===undefined) ? "" : this.props.setting.app.metaDataConfigPath;
        this.state = {
            mode: this.props.fstart,    //говорит в режиме первого старта открыта страничка или нет (из меню)
            level: MAIN_LV,            //уровни визуализации
            setting: set,
            radio: [true, false],
            detail_err: 0,

        };
        this.err_msg = React.createRef();
        this.server_response = "";
    }

    idServer  = nextId("fs_");
    idPort  = nextId("fs_");
    idDbName  = nextId("fs_");
    idUser  = nextId("fs_");
    idPass  = nextId("fs_");
    idInitP  = nextId("fs_");
    idRadioINI = nextId("fs_");
    idRadioZIP = nextId("fs_");

    getObjSetting() {     //собирает данные с формы и возвращает их в виде объекта js
        let db = {};
        let app = {};
        db.server = this.state.setting.server;
        db.port = Number(this.state.setting.port);
        db.dbname = this.state.setting.dbname;
        db.user = this.state.setting.user;
        db.pass = this.state.setting.pass;
        let settingObj = {};
        settingObj.db = db;
        //if ($("#" + this.idRadioINI).attr('checked')==='checked')
        if (this.state.radio[0])
            app.metaDataConfigPath =this.state.setting.ini;
            //app.metaDataConfigPath = $("#"+this.idInitP).val();            
        settingObj.app = app;
        let flag = true;
        if (db.server==="" || db.port==="" || db.dbname==="" || db.user==="" || db.pass==="" )   flag=false;
        //if (this.state.mode && $("#"+this.idInitP).val()==="") flag=false;
        if (this.state.mode && this.state.setting.ini==="") flag=false;
        if (flag ===false)  return -1;
        else    return settingObj;
    }     

    handleBtnSave() {   //обработка Сохранить
        document._DEBUG(5, "handleBtnSave");
        this.flagS = MODESAVE;
        (this.handleCheckCfg.bind(this))();
    }

    handleBtnCheck() {   ////обработка Проверить
        this.flagS = 0;
        (this.handleCheckCfg.bind(this))();
    }

    waitCheckCfg(){
        let xhr = this.xhr;
        console.log("xhrCfg -->", xhr);
        let rText = xhr.responseText;
        let objCfg = JSON.parse(rText);
        if (xhr.status === 200) {
            console.log("cfg >>", objCfg);
            if (this.flagS===MODESAVE)   this.handleSaveCfg();
            if (objCfg.service.isReady && this.flagS!==MODESAVE)
                $(this.err_msg.current).val("Проверка завершена. Ошибок не найдено.");
            if (!objCfg.service.isReady && !objCfg.service.isDBReady && objCfg.service.isMetaDataReady && this.flagS!==MODESAVE)
                $(this.err_msg.current).val("Ошибка в настройках БД");
            if (!objCfg.service.isReady && objCfg.service.isDBReady && !objCfg.service.isMetaDataReady && this.flagS!==MODESAVE)
                $(this.err_msg.current).val("Ошибка в настройках метаданных");
            if (!objCfg.service.isReady && !objCfg.service.isDBReady && !objCfg.service.isMetaDataReady && this.flagS!==MODESAVE)
                $(this.err_msg.current).val("Ошибки в настройках БД и метаданных");            
            this.setState({ detail_err: 0 });  

        }
        else {
            $(this.err_msg.current).val("Ошибка сервера.");           
            this.server_response = objCfg.message;
            this.setState({ detail_err: 1 });  
        }

    }

    handleCheckCfg() {
        document._DEBUG(5, "handleCheckCfg");
        let data = this.getObjSetting();
        if (data===-1)     {
            $(this.err_msg.current).val("Операция прервана. Заполните все поля");
            return;
        }
        //console.log("config_meta settingObj>> ", data);
        data.save = false;
        let flagFileZip = (data.app.metaDataConfigPath===undefined) ? true : false;
        // Для того, чтобы не обязательно выбирать файл
        if (flagFileZip && this.state.radio[0]) {
            flagFileZip = undefined;
        }
        this.xhr = LOAD.save_setting(data, flagFileZip, this.idInitP, this.waitCheckCfg.bind(this));
        $(this.err_msg.current).val("Идет проверка...");

    }

    waitSaveCfg(){
        let xhr = this.xhr;
        console.log("xhrCfg -->", xhr);
        if (xhr.status === 200) {
            let rText = xhr.responseText;
            let objCfg = JSON.parse(rText);
            console.log("cfg >>", objCfg);
            if (objCfg.service.isReady && this.state.mode)  this.props.handleSaveCfgFS();
            if (objCfg.service.isReady && !this.state.mode)  this.props.handleSaveCfg();
            this.flagS = 0;


        }
    }

    handleSaveCfg() {
        document._DEBUG(5, "handleSaveCfg");
        let data = this.getObjSetting();
        data.save = true;
        let flagFileZip = (data.app.metaDataConfigPath===undefined) ? true : false;
        document._DEBUG(5, "!!! flagFileZip:", flagFileZip, "this.state.radio[0]:", this.state.radio[0]);
        // Для того, чтобы не обязательно выбирать файл
        if (flagFileZip && this.state.radio[0]) {
            flagFileZip = undefined;
            document._DEBUG(5, "--> flagFileZip:", flagFileZip);
        }
        this.xhr = LOAD.save_setting(data, flagFileZip, this.idInitP, this.waitSaveCfg.bind(this));
        this.setState({
            level: SAVE_LV
        });

    }

    handleClickRadioMeta(e) {   
        let set = this.state.setting;
        set.ini = '';     
        if (e.target.dataset.meta==="ini") {
            this.setState({radio: [true, false], setting: set });
        }
        else {
            this.setState({radio: [false, true], setting: set });
        }
    }

    handleClickErrDetail() {      
        this.setState({ detail_err: 2 });  

    }

    handleChange = (e) =>{ 
        let value = (e.target.value===null || e.target.value==='0') ? "" : e.target.value;
        let nameSet = e.target.dataset.name;         
        let set = this.state.setting;
        set[nameSet] = value;
        this.setState({ setting: set });  
    }    

    render() {
        const messageBox = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 'auto'
        }        
        switch(this.state.level) {
        case SAVE_LV:
            return (
            <div>
                <main role="main" className="container-fluid" style={messageBox}>
                    <div className="lds-dual-ring"></div>
                    <p style={messageBox}> Сохранение... </p>
                </main>
            </div>
            );
        case MAIN_LV:
        default:
            console.log("setting render  detail_err >>", this.state.detail_err);
            let placeholderMeta = (this.state.radio[0] ===true) ? 'ini-file' : "";
            let typeMeta = (this.state.radio[0] ===true) ? 'text' : 'file';
            let ini_text = (this.state.fstart) ? "Путь к файлу метаданных" : "Путь к ini-файлу";            
            let style_d_btn = (this.state.detail_err===0) ? {display: 'none'} : null;
            let style_d_msg = (this.state.detail_err<2) ? {display: 'none'} : null;

            return (
                <form className="form-setting" >
                    <h1 className="mb-3 fw-normal">Основные настройки</h1>
                    <div className="notify" style = {{zIndex: '5', position: 'absolute', right: '1px', top: '53px'}}> </div>
                    <h3 className="mb-2 fw-normal">Настройка БД</h3>
                    <div className="form-floating mb-2">
                        <label htmlFor={this.idServer}>Сервер БД</label>
                        <input className="form-control" id={this.idServer} placeholder="server" data-name="server" value={this.state.setting.server} onChange={this.handleChange}/>
                    </div>
                    <div className="form-floating mb-2">
                        <label htmlFor={this.idPort}>Порт</label>
                        <input className="form-control" id={this.idPort} placeholder="port" data-name="port" value={this.state.setting.port} onChange={this.handleChange}/>
                    </div>
                    <div className="form-floating mb-2">
                        <label htmlFor={this.idDbName}>БД</label>
                        <input className="form-control" id={this.idDbName} placeholder="database" data-name="dbname" value={this.state.setting.dbname} onChange={this.handleChange}/>
                    </div>
                    <div className="form-floating mb-2">
                        <label htmlFor={this.idUser}>Пользователь</label>
                        <input className="form-control" id={this.idUser} placeholder="login" data-name="user" value={this.state.setting.user} onChange={this.handleChange}/>
                    </div>
                    <div className="form-floating mb-3">
                        <label htmlFor={this.idPass}>Пароль</label>
                        <input type="password" className="form-control" id={this.idPass} placeholder="Password" data-name="pass" value={this.state.setting.pass} onChange={this.handleChange}/>
                    </div>
                    <h3 className="mb-2 fw-normal">Настройка метаданных</h3>
                    <div className="form-floating mb-2">
                        <div className="form-check">
                            <input className="form-check-input" type="radio" data-meta="ini" onChange={this.handleClickRadioMeta.bind(this)} name="check_meta" id={this.idRadioINI} checked = {this.state.radio[0]}/>
                            <label className="form-check-label" htmlFor={this.idRadioINI}>  ini-файл </label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="radio" data-meta="zip" onChange={this.handleClickRadioMeta.bind(this)} name="check_meta" id={this.idRadioZIP} checked = {this.state.radio[1]}/>
                            <label className="form-check-label" htmlFor={this.idRadioZIP}>  zip-архив </label>
                        </div>
                        <label htmlFor={this.idInitP}>{ini_text}</label>
                        <input type={typeMeta} className="form-control" id={this.idInitP} placeholder={placeholderMeta} data-name="ini" value={this.state.setting.ini} onChange={this.handleChange}/>
                    </div>

                    <div className="input-group input-group-sm">
                        <div className="input-group-prepend">
                            <button className="btn btn-warning" type="button" onClick={this.handleBtnCheck.bind(this)}> Проверить </button>
                        </div>
                        <input type="text" className="form-control alert-secondary" role="alert" ref={this.err_msg} id="err_msg" readOnly />
                        <div className="input-group-append">
                            <button className="btn btn-success" type="button" onClick={this.handleBtnSave.bind(this)}> Сохранить </button>
                        </div>
                    </div>

                    <a className="e_detail_btn mb-3" style={style_d_btn} onClick={this.handleClickErrDetail.bind(this)} href={() => false}>Детали</a>
                    <div className="alert alert-danger err_server_message mb-2" role="alert" style={style_d_msg}> {this.server_response} </div>
                </form>
            );

        }
    }
}