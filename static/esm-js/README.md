# js 模块化



aippt 项目是纯 js 代码写的（非模块化），这里专门针对 js 模块化改写了 .esm.js 文件。



依赖外部模块如下：

```json
{
    "dependencies": {
        "@types/pako": "^2.0.3",
        "pako": "^2.1.0",
        "base64-js": "^1.5.1",
        "marked": "^13.0.2"
   }
}
```



在这个基础上我通过 vue3 + ts 重写了 aippt 项目作为参考：

https://github.com/veasion/aippt-vue
